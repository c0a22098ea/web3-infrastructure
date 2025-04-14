// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.21;

contract MappingExample{
    //addressがkey、uintがvalueのマップ
    mapping(address => uint) public User;

    //set関数により、key=msg.sender, value=newBalanceの組をマップに追加
    function set(uint newUser) public {
        User[msg.sender] = newUser;
    }

    //get関数により、key=msg.senderのvalueを取得
    function get() public view returns (uint) {
        return User[msg.sender];
    }
}