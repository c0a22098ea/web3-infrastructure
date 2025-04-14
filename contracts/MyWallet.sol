// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {ERC20} from "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyWallet is ERC20 {
    constructor() ERC20("MyWallet", "MW") {
        _mint(msg.sender, 1000000);
    }
}