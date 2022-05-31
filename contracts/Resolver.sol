// SPDX-FileCopyrightText: 2021 Tenderize <info@tenderize.me>

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IResolver.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

abstract contract Resolver is IResolver, Initializable {

    struct Protocol {
        string name;
        IERC20 steak;
        address stakingContract;
        uint256 depositInterval;
        uint256 depositThreshold;
        uint256 lastDeposit;
        uint256 rebaseInterval;
        uint256 rebaseThreshold;
        uint256 lastRebase;
    }

    mapping(address => Protocol) protocols;
    address gov;

    modifier onlyGov() {
        require(msg.sender == gov);
        _;
    }

    function initialize() external initializer {
        gov = msg.sender;
    }

    function depositChecker(address _tenderizer)
        external
        override
    returns (bool canExec, bytes memory execPayload){
        Protocol storage protocol = protocols[_tenderizer];
        uint256 tenderizerSteakBal = protocol.steak.balanceOf(_tenderizer);
        uint256 blockTimestamp = block.timestamp;

        if(tenderizerSteakBal > protocol.depositThreshold 
          && (protocol.lastDeposit == 0
           || protocol.lastDeposit + protocol.depositInterval < blockTimestamp)) {
            protocol.lastDeposit = blockTimestamp;
            canExec = true;
            execPayload = abi.encode(tenderizerSteakBal);
        } else {
            canExec = false;
            execPayload = abi.encode();
        }
    }

    function rebaseChecker(address _tenderizer)
        external 
        override
        virtual
    returns (bool canExec, bytes memory execPayload);
    
    // Governance functions
    function register(
        string memory _name,
        address _tenderizer,
        IERC20 _steak,
        address _stakingContract,
        uint256 _depositInterval,
        uint256 _depositThreshold,
        uint256 _rebaseInterval,
        uint256 _rebaseThreshold
    ) onlyGov external override {
        protocols[_tenderizer] = Protocol({
            name: _name,
            steak: _steak,
            stakingContract: _stakingContract,
            depositInterval: _depositInterval,
            depositThreshold: _depositThreshold,
            lastDeposit: block.timestamp - _depositInterval, // initialize checkpoint
            rebaseInterval: _rebaseInterval,
            rebaseThreshold: _rebaseThreshold,
            lastRebase: block.timestamp - _rebaseInterval // initialize checkpoint
        });
    }
}
