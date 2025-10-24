import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ChatApp contract...");
  
  const ChatApp = await ethers.getContractFactory("ChatApp");
  const chatApp = await ChatApp.deploy();
  
  await chatApp.waitForDeployment();
  const address = await chatApp.getAddress();
  
  console.log("ChatApp deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", (await ethers.getSigners())[0].address);
  
  // Save deployment info
  console.log("\n📋 Copy this address to your frontend .env.local:");
  console.log(`NEXT_PUBLIC_CHAT_ADDRESS=${address}`);
  
  // Verify on Polygonscan (optional)
  console.log("\n🔍 To verify contract on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
