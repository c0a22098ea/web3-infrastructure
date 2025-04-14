import { ethers } from "hardhat";

async function main() {
  // アカウント2と3と4のアドレスを取得
  const account2 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const account3 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const account4 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";


  const myToken = await ethers.deployContract("MyToken");
  myToken.waitForDeployment();
  console.log(`MyToken deployed to: ${myToken.target}`);

  const myERC20 = await ethers.deployContract("MyERC20");
  await myERC20.waitForDeployment();
  console.log(`MyERC20 deployed to: ${myERC20.target}`);

  // // const [ deployer ] = await ethers.getSigners();
  // const MyERC20 = await ethers.getContractFactory("MyERC20");
  // const myERC20 = await MyERC20.deploy(account2, account3, account4); 
  // await myERC20.waitForDeployment();
  // console.log(`MyERC20 deployed to: ${myERC20.target}`);

  // NFT Contractをデプロイする
  const myERC721 = await ethers.deployContract("MyERC721", ['MyERC721', 'MYERC721']);
  await myERC721.waitForDeployment();
  console.log(`myERC721 deployed to: ${myERC721.target}`);

  // ConduitControllerコントラクトをデプロイする
  // Seaportコントラクトのデプロイに、ConduitControllerのアドレスが必要なため先にデプロイ
  const conduitController = await ethers.deployContract("ConduitController");
  await conduitController.waitForDeployment();
  const conduitControllerAddress = await conduitController.getAddress()
  // Seaportコントラクトをデプロイ
  const seaport = await ethers.deployContract("Seaport", [conduitControllerAddress]);
  await seaport.waitForDeployment();
  console.log(`Seaport deployed to: ${seaport.target}`);

  const [owner] = await ethers.getSigners();

  // TimelockControllerをデプロイする
  const myTimelockController = await ethers.deployContract("MyTimelockController", [60 * 2 /* 2 minutes */, [owner.getAddress()], [owner.getAddress()], owner.getAddress()]);
  await myTimelockController.waitForDeployment();

  console.log(`TimelockController deployed to: ${myTimelockController.target}`);

  // MyGovernor Contractをデプロイする
  const myGovernor = await ethers.deployContract("MyGovernor", [myERC20.target, myTimelockController.target]);
  await myGovernor.waitForDeployment();

  console.log(`MyGovernor deployed to: ${myGovernor.target}`);

  // 実行Roleの割り当て, proposerRoleがないとQUEUE実行できない、executorRoleがないとExecute実行できない
  const proposerRole = await myTimelockController.PROPOSER_ROLE();
  const executorRole = await myTimelockController.EXECUTOR_ROLE();
  const adminRole = await myTimelockController.TIMELOCK_ADMIN_ROLE();

  await myTimelockController.grantRole(proposerRole, myGovernor.target);
  await myTimelockController.grantRole(executorRole, myGovernor.target);

  console.log(`MyGovernor granted to PROPOSER_ROLE and EXECUTER_ROLE`);

  await myERC20.grantMinterRole(myTimelockController.target);

  console.log(`MyTimelockController granted to MINTER_ROLE`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
