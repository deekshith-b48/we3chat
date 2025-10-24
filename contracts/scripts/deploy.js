const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying We3Chat Smart Contract...");

  // Get the contract factory
  const ChatApp = await ethers.getContractFactory("ChatApp");

  // Deploy the contract
  console.log("📦 Deploying contract...");
  const chatApp = await ChatApp.deploy();

  // Wait for deployment to complete
  await chatApp.waitForDeployment();

  const contractAddress = await chatApp.getAddress();
  console.log("✅ Contract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Network: ${network.name}`);
  console.log(`⛽ Gas Used: ${chatApp.deploymentTransaction()?.gasLimit?.toString()}`);

  // Verify contract on block explorer (if on testnet)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId: network.config.chainId,
    deployer: await chatApp.runner?.getAddress(),
    gasUsed: chatApp.deploymentTransaction()?.gasLimit?.toString(),
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for frontend configuration
  console.log("\n🔧 Next Steps:");
  console.log("1. Copy the contract address above");
  console.log("2. Update frontend/.env.local:");
  console.log(`   NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("3. Restart your frontend development server");
  console.log("4. Test the application with your Web3 wallet");

  return contractAddress;
}

// Handle errors
main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed successfully!`);
    console.log(`Contract deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });