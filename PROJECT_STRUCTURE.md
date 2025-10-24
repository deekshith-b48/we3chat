# 🏗️ We3Chat - Clean Project Structure

## 📁 Repository Organization

### **Root Directory Structure**
```
we3chat/
├── 📱 Frontend (Next.js 15 + TypeScript)
│   ├── src/                    # Main application source
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and services
│   │   ├── store/            # Zustand state management
│   │   └── utils/            # Helper functions
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   ├── next.config.ts        # Next.js configuration
│   ├── tsconfig.json         # TypeScript configuration
│   ├── Dockerfile            # Container configuration
│   └── docker-compose.yml    # Docker services
│
├── 🔗 Smart Contracts (Hardhat + Solidity)
│   ├── contracts/            # Solidity contracts
│   ├── scripts/              # Deployment scripts
│   ├── test/                 # Contract tests
│   ├── artifacts/            # Compiled contracts
│   ├── typechain-types/      # TypeScript bindings
│   └── hardhat.config.js     # Hardhat configuration
│
├── 🖥️ Backend Services
│   ├── backend/              # Main backend service
│   └── backend-local/        # Local development server
│
└── 📚 Documentation
    ├── README.md             # Project overview
    └── PROJECT_STRUCTURE.md  # This file
```

## 🎯 **Key Features**

### **🔐 Web3-Native Architecture**
- **Smart Contract**: Enhanced ChatApp.sol with group chats, reputation system
- **Frontend**: Next.js 15 with Web3 integration (Wagmi + Viem)
- **Encryption**: X25519 + AES-GCM client-side encryption
- **Storage**: IPFS integration for decentralized content storage
- **State Management**: Zustand for Web3 state management

### **📱 Frontend Components**
- **Dashboard**: Main chat interface with Web3 integration
- **WalletConnection**: Multi-wallet support (MetaMask, WalletConnect, Coinbase)
- **ChatInterface**: Real-time encrypted messaging
- **UserRegistration**: Web3 profile creation
- **ProtectedRoute**: Authentication guards

### **🔗 Smart Contract Features**
- **User Profiles**: On-chain user registration and management
- **Friend System**: Mutual consent friend requests
- **Group Chats**: Multi-participant encrypted conversations
- **Reputation System**: Community-driven user scoring
- **Message Storage**: On-chain metadata with IPFS content

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
# Frontend
npm install

# Smart Contracts
cd contracts
npm install
```

### **2. Environment Setup**
```bash
# Copy environment files
cp .env.example .env.local
```

### **3. Deploy Smart Contract**
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygonAmoy
```

### **4. Start Development**
```bash
# Frontend development
npm run dev

# Or with Docker
docker-compose up
```

## 📦 **Technology Stack**

### **Frontend**
- **Framework**: Next.js 15 + TypeScript
- **Web3**: Wagmi + Viem + Web3Modal
- **State**: Zustand
- **Styling**: TailwindCSS
- **Encryption**: TweetNaCl (X25519 + AES-GCM)
- **Storage**: IPFS + Web3.Storage

### **Smart Contracts**
- **Language**: Solidity ^0.8.19
- **Framework**: Hardhat
- **Security**: OpenZeppelin (Ownable, ReentrancyGuard)
- **Network**: Polygon Amoy Testnet

### **Backend**
- **Runtime**: Node.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: SIWE (Sign-In with Ethereum)
- **Real-time**: WebSocket subscriptions

## 🔧 **Development Commands**

### **Frontend**
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm test            # Run tests
```

### **Smart Contracts**
```bash
npx hardhat compile  # Compile contracts
npx hardhat test     # Run contract tests
npx hardhat deploy  # Deploy to network
```

### **Docker**
```bash
docker-compose up    # Start all services
docker-compose down  # Stop all services
```

## 📋 **Project Status**

✅ **Completed Features**
- Enhanced smart contract with advanced features
- Web3-native frontend with wallet integration
- End-to-end encryption implementation
- IPFS integration for decentralized storage
- Comprehensive test suite
- Docker containerization
- Clean project structure

🔄 **Ready for Development**
- All core functionality implemented
- Production-ready configuration
- Comprehensive documentation
- Clean, organized codebase

## 🎉 **Repository Status**

- **GitHub**: [https://github.com/deekshith-b48/we3chat](https://github.com/deekshith-b48/we3chat)
- **Structure**: Clean, single-level organization
- **Status**: ✅ All changes pushed successfully
- **Working Tree**: Clean (no uncommitted changes)

---

**🎯 Your Web3-native chat application is now organized, clean, and ready for development!**
