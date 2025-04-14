import {expect} from 'chai';
import { ethers } from 'hardhat';

describe("MyWallet", function () {
    it("トークンの全供給量を所有者に割り当てる", async function () {
        const [owner, account1, account2] = await ethers.getSigners();
        const MyWallet = await ethers.deployContract("MyWallet");
        const account1balance = await MyWallet.balanceOf(account1.address);
        const ownerbalance = await MyWallet.balanceOf(owner.address);
        const account2balance = await MyWallet.balanceOf(account2.address);
        console.log(ownerbalance.toString());
        console.log(account1balance.toString());
        console.log(account2balance.toString());
    });
});