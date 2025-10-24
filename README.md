# 🚀 **We3Chat - Web3-Native Decentralized Chat Application**

A fully decentralized chat application built on blockchain with advanced privacy features, group chats, and reputation system.

## ✨ **Features**

### 🔐 **Privacy & Security**
- **End-to-End Encryption**: X25519 + AES-GCM client-side encryption
- **Decentralized Storage**: IPFS for encrypted message content
- **Wallet Authentication**: No central authority, users control their data
- **Censorship Resistant**: Messages stored on blockchain and IPFS

### 💬 **Advanced Chat Features**
- **Direct Messaging**: Encrypted 1-on-1 conversations
- **Group Chats**: Multi-participant encrypted group conversations
- **File Sharing**: Encrypted file upload and sharing
- **Message Types**: Text, images, files, voice messages
- **Real-time Updates**: Blockchain event listening for instant messaging

### 🌐 **Web3 Integration**
- **Multi-Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet
- **Gas Optimization**: Efficient smart contract design
- **Reputation System**: User rating and reputation tracking
- **Friend Management**: Mutual consent friend requests

## 🏗️ **Architecture**

### **Smart Contract (Solidity)**
- Enhanced ChatApp contract with group chats and reputation
- OpenZeppelin security patterns
- Gas-optimized storage and operations
- Comprehensive event system

### **Frontend (Next.js + TypeScript)**
- Web3-native state management with Zustand
- Viem for blockchain interactions
- Real-time UI updates
- Responsive design with Tailwind CSS

### **Storage (IPFS)**
- Web3.Storage for primary IPFS access
- Encrypted content storage
- File compression and optimization
- Multiple gateway support

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Web3 wallet (MetaMask recommended)
- IPFS service (Web3.Storage or Pinata)

### **Installation**

1. **Clone and Setup**
```bash
git clone <repository-url>
cd we3chat
chmod +x setup-web3.sh
./setup-web3.sh
```

2. **Configure Environment**
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. **Deploy Smart Contract**
```bash
cd contracts
npx hardhat run scripts/deploy.js --network polygonAmoy
# Copy the deployed contract address to frontend/.env.local
```

4. **Start Development Server**
```bash
cd frontend
npm run dev
```

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Web3 Configuration
NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# IPFS Configuration
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CHAIN_NAME=Polygon Amoy
```

### **Required Services**

1. **Web3.Storage Account**
   - Sign up at [Web3.Storage](https://web3.storage)
   - Create API token
   - Add to environment variables

2. **WalletConnect Project**
   - Create project at [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Get project ID
   - Add to environment variables

3. **Polygon Amoy Testnet**
   - Get testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology)
   - Add to MetaMask network

## 📱 **Usage**

### **User Registration**
1. Connect your Web3 wallet
2. Complete profile setup with username and bio
3. Generate encryption key pair (stored locally)
4. Start chatting!

### **Sending Messages**
1. Add friends by wallet address
2. Send encrypted messages
3. Share files and images
4. Create group chats

### **Privacy Features**
- All messages encrypted client-side
- Keys never leave your device
- Content stored on IPFS
- Metadata on blockchain

## 🛠️ **Development**

### **Project Structure**
```
we3chat/
├── contracts/           # Smart contracts
│   ├── contracts/       # Solidity contracts
│   ├── scripts/         # Deployment scripts
│   └── test/           # Contract tests
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── lib/        # Web3 utilities
│   │   ├── store/      # State management
│   │   └── hooks/      # Custom hooks
│   └── public/      # Static assets
└── docs/              # Documentation
```

### **Key Components**

- **Smart Contract**: Enhanced ChatApp with group chats and reputation
- **Web3 Store**: Zustand state management with Web3 integration
- **Encryption Service**: X25519 + AES-GCM message encryption
- **IPFS Service**: Web3.Storage integration with fallbacks
- **UI Components**: Modern React components with Web3 features

### **Testing**

```bash
# Test smart contracts
cd contracts
npx hardhat test

# Test frontend
cd frontend
npm run test
```

## 🚀 **Deployment**

### **Smart Contract**
```bash
cd contracts
npx hardhat run scripts/deploy.js --network polygonAmoy
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

### **Frontend**
```bash
# Vercel (Recommended)
vercel --prod

# Docker
docker build -t we3chat .
docker run -p 3000:3000 we3chat

# Custom Server
npm run build
npm start
```

## 🔒 **Security**

### **Smart Contract Security**
- ✅ Access control with OpenZeppelin
- ✅ Reentrancy protection
- ✅ Input validation
- ✅ Gas optimization

### **Frontend Security**
- ✅ Client-side encryption
- ✅ Local key storage
- ✅ No private key exposure
- ✅ Secure IPFS uploads

### **Privacy Features**
- ✅ End-to-end encryption
- ✅ Decentralized storage
- ✅ No central authority
- ✅ User data ownership

## 📊 **Monitoring**

### **Smart Contract Events**
- User registrations
- Message sending
- Friend requests
- Group creation
- Reputation updates

### **Performance Metrics**
- Message encryption time
- IPFS upload/download speed
- Gas usage optimization
- User engagement

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support**

- **Documentation**: Check the docs/ folder
- **Issues**: Create GitHub issue
- **Discord**: Join our community
- **Email**: support@we3chat.com

## 🎯 **Roadmap**

- [ ] Mobile app (React Native)
- [ ] Voice messages
- [ ] Video calls
- [ ] NFT profile pictures
- [ ] Cross-chain support
- [ ] Advanced group features
- [ ] Message search
- [ ] Offline support

---

**🎉 Welcome to the future of decentralized communication!**