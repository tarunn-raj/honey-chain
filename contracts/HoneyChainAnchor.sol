// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HoneyChainAnchor {
    address public immutable owner;
    mapping(string => bytes32) public merkleRoots;

    event Anchored(string batchCode, bytes32 root, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can anchor");
        _;
    }

    function anchor(string calldata batchCode, bytes32 root) external onlyOwner {
        merkleRoots[batchCode] = root;
        emit Anchored(batchCode, root, block.timestamp);
    }
}
