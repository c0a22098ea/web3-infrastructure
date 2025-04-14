import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyERC20 contract", function () {
  it("トークンの全供給量を所有者に割り当てる", async function () {
    // 最初に取得できるアカウントをOwnerとして設定
    const [owner, account1, account2] = await ethers.getSigners();

    // MyERC20をデプロイ
    const myERC20 = await ethers.deployContract("MyERC20");

    // balanceOf関数を呼び出しOwnerのトークン量を取得
    const ownerBalance = await myERC20.balanceOf(owner.address);
    const ownerBalance1 = await myERC20.balanceOf(account1.address);
    const ownerBalance2 = await myERC20.balanceOf(account2.address);

    // Ownerのトークン量がこのコントラクトの全供給量に一致するか確認
    expect(await myERC20.totalSupply()).to.equal(ownerBalance+ownerBalance1+ownerBalance2);
  });
});
