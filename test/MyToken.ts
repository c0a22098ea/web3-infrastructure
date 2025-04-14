import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

async function deployFixture() {
    const [owner, account1, account2] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();
    const account1Address = await account1.getAddress();
    const account2Address = await account2.getAddress();
    const MyToken = await ethers.deployContract("MyToken", [ownerAddress]);
    const balance = await MyToken.balanceOf(account1Address);
    console.log(balance);

    
    return { MyToken, owner, account1, account2 };
}


describe("初期流通量とNFT作成のテスト", function () {
    it("初期流通量は0", async function () {
        const { MyToken } = await loadFixture(deployFixture);
    });

    // NFTをミントするテスト
    it("NFTをミントするテスト", async function () {
        const { MyToken, account1 } = await loadFixture(deployFixture);

        // owner が account1 に NFT をミント
        await MyToken.safeMint(account1.address, 'https://example.com/nft1.json');
        
        // account1 のNFT保有数が1になっているか確認
        expect(await MyToken.balanceOf(account1.address)).to.equal(1);
        
        // コントラクト全体のNFT発行総数が1になっているか確認
        expect(await MyToken.totalSupply()).to.equal(1);
    });
});
    
describe("二人目のNFT作成のテスト", function () {
    it("初期流通量は0", async function () {
        const { MyToken } = await loadFixture(deployFixture);
    });
    
    // NFTをミントするテスト
    it("NFTをミントするテスト", async function () {
        const { MyToken, account2 } = await loadFixture(deployFixture);

        // owner が account1 に NFT をミント
        await MyToken.safeMint(account2.address, 'https://example.com/nft1.json');
        
        // account1 のNFT保有数が1になっているか確認
        expect(await MyToken.balanceOf(account2.address)).to.equal(1);
        
        // コントラクト全体のNFT発行総数が1になっているか確認
        expect(await MyToken.totalSupply()).to.equal(1);
    });
});



describe("NFTをtransferするテスト", function () {
    it("NFTをtransferするテスト", async function () {
        const { MyToken, owner, account1, account2 } = await loadFixture(deployFixture);

        // owner が owner に NFT をミント
        await MyToken.safeMint(owner.address, 'https://example.com/nft1.json');
        
        // account1 のNFT保有数が1になっているか確認
        expect(await MyToken.balanceOf(owner.address)).to.equal(1);

        // owner が account1 に NFT を transfer することを許可
        //const tx = await MyToken.connect(owner).approve(account1.address, 0);
        //await tx.wait();
        
        // account1 に NFT を transfer
        await MyToken.transferFrom(owner.address, account1.address, 0);
        
        // account1 のNFT保有数が0になっているか確認
        expect(await MyToken.balanceOf(owner.address)).to.equal(0);
        
        //account2 のNFT保有数が1になっているか確認
        expect(await MyToken.balanceOf(account1.address)).to.equal(1);
    });

    it("NFTをtransferするテスト(owner > account1 > account2)", async function () {
        const { MyToken, owner, account1, account2 } = await loadFixture(deployFixture);

        // owner が owner に NFT をミント
        await MyToken.safeMint(owner.address, 'https://example.com/nft1.json');
        
        // owner が account1 に NFT を transfer することを許可
        //const tx1 = await MyToken.connect(owner).approve(account1.address, 0);

        // account1 に NFT を transfer
        await MyToken.safeTransferFrom(owner.address, account1.address, 0);
        
        // owner が account1 に NFT を transfer することを許可
        // const tx2 = await MyToken.connect(account1).approve(account2.address, 0);
        // account2 に NFT を transfer
        await MyToken.connect(account1).safeTransferFrom(account1.address, account2.address, 0);
    });

    it("NFTをtransferするテスト(account1 > account2)", async function () {
        const { MyToken, owner, account1, account2 } = await loadFixture(deployFixture);

        // owner が account1 に NFT をミント
        await MyToken.connect(owner).safeMint(account1.address, 'https://example.com/nft1.json');

        // account1 に NFT を transfer
        await MyToken.connect(account1).safeTransferFrom(account1.address, account2.address, 0);
    });
});

