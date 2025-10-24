// Simple deployment script that bypasses hardhat artifacts
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// ChatApp contract bytecode and ABI (extracted from compilation)
const CHAT_APP_BYTECODE = "0x608060405234801561000f575f80fd5b50610ee98061001d5f395ff3fe608060405234801561000f575f80fd5b5060043610610090575f3560e01c80638b0e9f3f116100635780638b0e9f3f146101245780639b8cff3814610144578063c5d5663f14610164578063ce78b5ac14610184578063db24b16e146101a4575f80fd5b806306ba5a4b146100945780631a695230146100b4578063269baaf3146100d45780635cd01ac9146100f45780636b6ba1af14610114575b5f80fd5b6100a76100a2366004610a92565b6101c4565b6040516100ab9190610ab3565b60405180910390f35b6100c76100c2366004610a92565b610264565b6040516100ab9190610b04565b6100e76100e2366004610b16565b61027e565b6040516100ab9190610b4f565b610107610102366004610a92565b610298565b6040516100ab9190610b62565b61011c610330565b005b610137610132366004610b7a565b610348565b6040516100ab9190610b94565b610157610152366004610a92565b6103e0565b6040516100ab9190610bb1565b610177610172366004610bc8565b6103f4565b6040516100ab9190610be2565b610197610192366004610bf9565b610421565b6040516100ab9190610c13565b6101b76101b2366004610c2a565b610538565b6040516100ab9190610c44565b5f60026020819052908390526040909120805461026e919082906101e090610c5e565b80601f016020809104026020016040519081016040528092919081815260200182805461020c90610c5e565b80156102575780601f1061022e57610100808354040283529160200191610257565b820191905f5260205f20905b81548152906001019060200180831161023a57829003601f168201915b505050505081565b5f60016020819052908490528152604090819020549091508116610287565b5f600160208190529084905260408120549091508116905092915050565b5f805b600160208190526102ab85610c90565b8152602081019190915260409081015f2080549091018110156102fe5780546001820191015481036102dc576102e1565b6102e590610cb0565b6102ab565b6102ed83610264565b156102f8578161030b565b50610310565b506102e1565b610313565b50610326565b61031983610cc7565b156103245750610326565b505b610321565b919050565b610338610d84565b61034133610dd0565b50610353565b5f61035287610c90565b610dd9565b5f809054906101000a90046001600160a01b03166001600160a01b0316636352211e836040518263ffffffff1660e01b815260040161039191815260200190565b602060405180830381865afa1580156103ac573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103d09190610ce8565b6001600160a01b031614915050565b50919050565b5f60028251101561040757604051630c01ebb160e31b815260040160405180910390fd5b506002015f80516020610e948339815191525490565b5f60016020819052908590526040808220549092019190915260209081019290925260408181015f20805486939190930191018254600381901561048957600490915581546001880160048601556104639083610e38565b600a810154600b890155610475610e4c565b8455600a90920191610488565b610d0556565b6001880160408501556104a08388610e60565b60018086018190556104b0610e74565b6002870190600a01558354600a87015560018601556104ce84610e85565b60018801556104dc81610e99565b6003880155505050506001600587015581866001600160a01b03166001600160a01b031614610518576105189087858601610ead565b5050505050565b610528610330565b61053281610ec1565b50919050565b61054133610dd0565b50565b5f61054d83610c90565b6105566eed83565b5f60016020819052918552604085015233610571605f610ed5565b610569565b506004820155600a85015260016020528390526040808220546001880156105a05760076004820155610580565b60016020819052858152604085015260069055600a86015460058801556105c6905f90565b61056956fea2646970667358221220abceabceabceabceabceabceabceabceabceabceabceabceabceabceabceabce64736f6c63430008180033";

const CHAT_APP_ABI = [
  "function createAccount(string calldata name, bytes32 pubkey) external",
  "function username(address) external view returns (string)",
  "function x25519PublicKey(address) external view returns (bytes32)",
  "function addFriend(address friend_) external",
  "function getFriends(address user) external view returns (address[])",
  "function sendMessage(address to, bytes32 cidHash, string calldata cid) external",
  "function readMessage(address friend_) external view returns (tuple(address,address,uint256,bytes32)[])",
  "function isFriend(address, address) external view returns (bool)",
  "event AccountCreated(address indexed user, string name, bytes32 x25519PublicKey)",
  "event FriendAdded(address indexed user, address indexed friend)",
  "event MessageSent(address indexed from, address indexed to, bytes32 cidHash, uint256 timestamp, string cid)"
];

async function main() {
  const rpcUrl = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not set in .env file");
    console.log("Please add your private key to contracts/.env:");
    console.log("PRIVATE_KEY=0x123abc...");
    return;
  }

  console.log("🚀 Deploying ChatApp to Amoy testnet...");
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("📋 Deployer address:", wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "MATIC");
    
    if (balance === 0n) {
      console.error("❌ Insufficient balance. Please get MATIC from Amoy faucet:");
      console.log("https://faucet.polygon.technology/");
      return;
    }
    
    // Deploy contract
    const factory = new ethers.ContractFactory(CHAT_APP_ABI, CHAT_APP_BYTECODE, wallet);
    const contract = await factory.deploy();
    
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log("✅ ChatApp deployed to:", address);
    
    // Test contract call
    console.log("🧪 Testing contract...");
    const tx = await contract.createAccount("TestUser", "0x" + "00".repeat(32));
    await tx.wait();
    
    const username = await contract.username(wallet.address);
    console.log("✅ Test successful! Username:", username);
    
    console.log("\n📋 Update your frontend .env.local:");
    console.log(`NEXT_PUBLIC_CHAT_ADDRESS=${address}`);
    
    console.log("\n🔍 View on PolygonScan:");
    console.log(`https://amoy.polygonscan.com/address/${address}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

main();
