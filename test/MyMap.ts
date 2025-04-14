import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function deployFixture() {
    const [owner, account1, account2] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    const account1Address = await account1.getAddress();
    const account2Address = await account2.getAddress();
    const MyToken = await ethers.deployContract("MyMap", [ownerAddress]);
    const balance = await MyToken.balanceOf(account1Address);
    console.log(balance);

    
    return { MyToken, owner, account1, account2 };
}