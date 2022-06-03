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
        view
    returns (bool canExec, bytes memory execPayload){
        execPayload = abi.encodeWithSelector(IResolver.claimRewardsExecutor.selector, _tenderizer);
        Protocol storage protocol = protocols[_tenderizer];

        // Return true if pending deposits to stake
        canExec = _depositChecker(_tenderizer);
        if(canExec){
            return (canExec, execPayload);
        }

        if(protocol.lastClaim + protocol.rebaseInterval > block.timestamp) {
            return (canExec, execPayload);
        }

        ITenderizer tenderizer = ITenderizer(_tenderizer);
        uint256 currentPrinciple = tenderizer.totalStakedTokens();
        uint256 stake;

        if (keccak256(bytes(protocol.name)) == LIVEPEER) {
            // Livepeer
            ILivepeer livepeer = ILivepeer(protocol.stakingContract);
            stake = livepeer.pendingStake(_tenderizer, MAX_ROUND);
        }

        if (stake > currentPrinciple + protocol.rebaseThreshold){
            canExec = true;
        }
    }
}
