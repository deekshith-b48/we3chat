import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting We3Chat contract deployment...");

  // Get the contract factory
  const We3Chat = await ethers.getContractFactory("We3Chat");

  // Deploy the contract
  console.log("📝 Deploying We3Chat contract...");
  const we3Chat = await We3Chat.deploy();

  // Wait for deployment to complete
  await we3Chat.waitForDeployment();

  const contractAddress = await we3Chat.getAddress();
  console.log("✅ We3Chat deployed to:", contractAddress);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const owner = await we3Chat.owner();
  console.log("👤 Contract owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: await ethers.provider.getNetwork(),
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    owner,
  };

  console.log("📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Update config file if needed
  console.log("💡 Don't forget to update your frontend configuration with the new contract address!");
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network.name} (Chain ID: ${deploymentInfo.network.chainId})`);

  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
