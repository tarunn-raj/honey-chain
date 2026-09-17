import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying HoneyChainAnchor from ${deployer.address}`);
  const anchor = await ethers.deployContract("HoneyChainAnchor");
  await anchor.waitForDeployment();
  console.log(`HoneyChainAnchor deployed to ${await anchor.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
