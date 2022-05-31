// SPDX-FileCopyrightText: 2021 Tenderize <info@tenderize.me>

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Resolver.sol";
import "./interfaces/ITenderizer.sol";

import "./interfaces/ILivepeer.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

contract ArbitrumResolver is Resolver {
    IQuoterV2 public uniswapQuoter;
    uint256 MAX_ROUND = 2**256 - 1;

    function rebaseChecker(address _tenderizer)
        external 
        override
    returns (bool canExec, bytes memory execPayload){
        execPayload = abi.encode();
        Protocol storage protocol = protocols[_tenderizer];
        ITenderizer tenderizer = ITenderizer(_tenderizer);

        uint256 currentPrinciple = tenderizer.totalStakedTokens();
        uint256 stake;

        if (keccak256(bytes(protocol.name)) == keccak256(bytes("Livepeer"))) {
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

        uint256 blockTimestamp = block.timestamp;

        if (stake > currentPrinciple + protocol.rebaseThreshold
          && (protocol.lastRebase == 0
           || protocol.lastRebase + protocol.rebaseInternval < blockTimestamp)){
            protocol.lastRebase = blockTimestamp;
            canExec = true;
        } else {
            canExec = false;
        }
    }

    // Livepeer specific functions
    function setUniswapQuoter(address _uniswapQuoter) external onlyGov {
        uniswapQuoter = IQuoterV2(_uniswapQuoter);
    }
}
