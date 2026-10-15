// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Ledger {
    event Recorded(address indexed actor, bytes32 indexed id, bytes32 dataHash, string note);

    function record(bytes32 id, bytes32 dataHash, string calldata note) external {
        emit Recorded(msg.sender, id, dataHash, note);
    }
}
