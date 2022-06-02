// SPDX-FileCopyrightText: 2021 Tenderize <info@tenderize.me>

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./Resolver.sol";

import "./interfaces/ILivepeer.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

contract ArbitrumResolver is Resolver {
    IQuoterV2 public uniswapQuoter;
    uint256 MAX_ROUND = 2**256 - 1;

    bytes32 constant LIVEPEER = 0xd205d14d3a0d2f58a4c37465ba21641a9c0ee2069cf49bd9f35c0cc161a04dd7; // "Livepeer"

    function rebaseChecker(address _tenderizer)
        external 
        override
    returns (bool canExec, bytes memory execPayload){
        execPayload = abi.encodeWithSelector(ITenderizer.claimRewards.selector);
        Protocol storage protocol = protocols[_tenderizer];

        // Return true if pending deposits to stake
        canExec = _depositChecker(_tenderizer);
        if(canExec){
            return (canExec, execPayload);
        }

        if(protocol.lastRebase + protocol.rebaseInterval > block.timestamp) {
            return (canExec, execPayload);
        }

        ITenderizer tenderizer = ITenderizer(_tenderizer);
        uint256 currentPrinciple = tenderizer.totalStakedTokens();
        uint256 stake;

        if (keccak256(bytes(protocol.name)) == LIVEPEER) {
            // Livepeer
            ILivepeer livepeer = ILivepeer(protocol.stakingContract);
            stake = livepeer.pendingStake(address(this), MAX_ROUND);

            // Check for ETH Rewards
            uint256 ethFees = livepeer.pendingFees(address(this), MAX_ROUND);
            if(ethFees > 0){
                IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2.QuoteExactInputSingleParams({
                        tokenIn: address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
                        tokenOut: address(protocol.steak),
                        amountIn: ethFees,
                        fee: 10000,
                        sqrtPriceLimitX96: 0
                    });
                (uint256 amountOut,,,)= uniswapQuoter.quoteExactInputSingle(params);
                stake += amountOut;
            }
        }

        if (stake > currentPrinciple + protocol.rebaseThreshold){
            canExec = true;
        }

        protocol.lastRebase = block.timestamp;
    }

    // Livepeer specific functions
    function setUniswapQuoter(address _uniswapQuoter) external onlyGov {
        uniswapQuoter = IQuoterV2(_uniswapQuoter);
    }
}
