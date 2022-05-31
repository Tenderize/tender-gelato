// SPDX-FileCopyrightText: 2021 Tenderize <info@tenderize.me>

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./Resolver.sol";
import "./interfaces/ITenderizer.sol";

import "./interfaces/IGraph.sol";
import "./interfaces/IMatic.sol";
import "./interfaces/IAudius.sol";

contract MainnetResolver is Resolver {
    // Matic contstants
    uint256 constant EXCHANGE_RATE_PRECISION = 100; // For Validator ID < 8
    uint256 constant EXCHANGE_RATE_PRECISION_HIGH = 10**29; // For Validator ID >= 8

    function rebaseChecker(address _tenderizer)
        external 
        override
    returns (bool canExec, bytes memory execPayload){
        execPayload = abi.encode();
        Protocol storage protocol = protocols[_tenderizer];
        ITenderizer tenderizer = ITenderizer(_tenderizer);

        uint256 currentPrinciple = tenderizer.totalStakedTokens();
        uint256 stake;

        if (keccak256(bytes(protocol.name)) == keccak256(bytes("Graph"))) {
            // Graph
            address node = tenderizer.node();
            IGraph graph = IGraph(protocol.stakingContract);
            IGraph.Delegation memory delegation = graph.getDelegation(node, address(this));
            IGraph.DelegationPool memory delPool = graph.delegationPools(node);

            uint256 delShares = delegation.shares;
            uint256 totalShares = delPool.shares;
            uint256 totalTokens = delPool.tokens;

            stake = (delShares * totalTokens) / totalShares;
        } else if (keccak256(bytes(protocol.name)) == keccak256(bytes("Audius"))) {
            // Audius
            IAudius audius = IAudius(protocol.stakingContract);
            stake = audius.getTotalDelegatorStake(address(this));
        } else if (keccak256(bytes(protocol.name)) == keccak256(bytes("Matic"))) {
            // Matic
            IMatic matic = IMatic(protocol.stakingContract);
            uint256 shares = matic.balanceOf(address(this));
            stake = (shares * _getExchangeRate(matic)) / _getExchangeRatePrecision(matic);
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

    // Matic internal functions
    function _getExchangeRatePrecision(IMatic _matic) internal view returns (uint256) {
        return _matic.validatorId() < 8 ? EXCHANGE_RATE_PRECISION : EXCHANGE_RATE_PRECISION_HIGH;
    }

    function _getExchangeRate(IMatic _matic) internal view returns (uint256) {
        uint256 rate = _matic.exchangeRate();
        return rate == 0 ? 1 : rate;
    }
}
