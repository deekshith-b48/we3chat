# 🛠️ **Web3 Chat Development Guide**

## **Overview**
This guide covers development, testing, and contribution to the Web3-native chat application.

---

## **🏗️ Development Setup**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Git
- Web3 wallet (MetaMask)
- IPFS service account

### **Initial Setup**
```bash
# Clone repository
git clone <repository-url>
cd we3chat

# Run setup script
chmod +x setup-web3.sh
./setup-web3.sh

# Install additional dependencies
cd frontend
npm install @types/node @types/react @types/react-dom
```

---

## **🔧 Smart Contract Development**

### **Contract Structure**
```
contracts/
├── contracts/
│   └── ChatApp.sol          # Main contract
├── scripts/
│   └── deploy.js           # Deployment script
├── test/
│   └── ChatApp.test.js     # Test suite
└── hardhat.config.js       # Hardhat configuration
```

### **Key Features**
- **User Management**: Registration, profiles, reputation
- **Friend System**: Requests, acceptance, removal
- **Group Chats**: Creation, joining, leaving
- **Messaging**: Direct and group messages
- **Reputation**: User rating system
- **Admin Functions**: User/group management

### **Development Commands**
```bash
cd contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.js --network polygonAmoy

# Verify contract
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

### **Testing**
```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test --grep "User Registration"

# Gas report
REPORT_GAS=true npx hardhat test
```

---

## **🎨 Frontend Development**

### **Project Structure**
```
frontend/src/
├── components/           # React components
│   ├── WalletConnection.tsx
│   ├── UserRegistration.tsx
│   ├── ChatInterface.tsx
│   └── dashboard/
├── lib/                 # Utilities
│   ├── web3Api.ts       # Web3 API layer
│   ├── messageEncryption.ts
│   ├── ipfs.ts
│   └── testWeb3.ts
├── store/               # State management
│   └── web3Store.ts
└── hooks/               # Custom hooks
```

### **Key Technologies**
- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Viem**: Web3 interactions
- **Wagmi**: Wallet integration

### **Development Commands**
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

### **Environment Configuration**
```bash
# Copy environment template
cp .env.local.example .env.local

# Required variables
NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

---

## **🧪 Testing**

### **Smart Contract Tests**
```bash
cd contracts

# Run all tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test file
npx hardhat test test/ChatApp.test.js
```

### **Frontend Tests**
```bash
cd frontend

# Run Web3 integration tests
npm run test:web3

# Run component tests
npm run test:components

# Run E2E tests
npm run test:e2e
```

### **Test Categories**
1. **Unit Tests**: Individual functions
2. **Integration Tests**: Component interactions
3. **Web3 Tests**: Blockchain interactions
4. **E2E Tests**: Full user workflows

---

## **🔐 Security Considerations**

### **Smart Contract Security**
- **Access Control**: Only authorized functions
- **Input Validation**: All parameters checked
- **Reentrancy Protection**: External call safety
- **Gas Optimization**: Efficient operations

### **Frontend Security**
- **Client-Side Encryption**: Keys never transmitted
- **Secure Storage**: Local key management
- **Input Sanitization**: XSS prevention
- **HTTPS Only**: Secure connections

### **Security Checklist**
- [ ] Contract functions have proper access control
- [ ] Input validation on all user inputs
- [ ] Encryption keys stored securely
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production
- [ ] Content Security Policy configured

---

## **📊 Performance Optimization**

### **Smart Contract**
- **Gas Optimization**: Efficient storage patterns
- **Batch Operations**: Multiple actions in one transaction
- **Event Indexing**: Efficient event queries
- **Storage Packing**: Optimize struct layouts

### **Frontend**
- **Code Splitting**: Lazy load components
- **Image Optimization**: Compress and resize
- **Caching**: Browser and CDN caching
- **Bundle Analysis**: Optimize bundle size

### **IPFS**
- **Content Deduplication**: Avoid duplicate uploads
- **Compression**: Compress large files
- **Pinning**: Pin important content
- **Gateway Selection**: Use fastest gateways

---

## **🚀 Deployment**

### **Smart Contract Deployment**
```bash
# Deploy to testnet
npx hardhat run scripts/deploy.js --network polygonAmoy

# Verify contract
npx hardhat verify --network polygonAmoy <ADDRESS>

# Deploy to mainnet (when ready)
npx hardhat run scripts/deploy.js --network polygon
```

### **Frontend Deployment**
```bash
# Vercel deployment
vercel --prod

# Docker deployment
docker build -t we3chat .
docker run -p 3000:3000 we3chat

# Custom server
npm run build
npm start
```

---

## **🔍 Debugging**

### **Smart Contract Debugging**
```bash
# Debug specific test
npx hardhat test --grep "test name" --verbose

# Console logs in tests
console.log("Debug info:", variable);

# Hardhat console
npx hardhat console --network localhost
```

### **Frontend Debugging**
```bash
# Development with debug logs
DEBUG=we3chat:* npm run dev

# Browser DevTools
# - Network tab for Web3 calls
# - Console for error logs
# - Application tab for storage
```

### **Common Issues**
1. **Wallet Connection**: Check network configuration
2. **Contract Calls**: Verify contract address
3. **IPFS Uploads**: Check service configuration
4. **Encryption**: Verify key generation

---

## **📝 Code Style**

### **Smart Contract Style**
```solidity
// Use descriptive function names
function registerUser(
    string calldata username,
    string calldata bio,
    string calldata avatarCid,
    bytes32 publicKey
) external {
    // Input validation first
    require(bytes(username).length > 0, "Username required");
    
    // Business logic
    userProfiles[msg.sender] = UserProfile({
        username: username,
        bio: bio,
        avatarCid: avatarCid,
        x25519PublicKey: publicKey,
        reputation: 0,
        isActive: true,
        createdAt: block.timestamp,
        lastSeen: block.timestamp
    });
    
    // Emit events
    emit UserRegistered(msg.sender, username, publicKey);
}
```

### **Frontend Style**
```typescript
// Use TypeScript interfaces
interface UserProfile {
  username: string;
  bio: string;
  avatarCid: string;
  publicKey: string;
  reputation: number;
  isActive: boolean;
  createdAt: number;
  lastSeen: number;
}

// Use descriptive function names
const handleSendMessage = async (content: string) => {
  try {
    setIsLoading(true);
    await sendMessage(content);
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    setIsLoading(false);
  }
};
```

---

## **🤝 Contributing**

### **Pull Request Process**
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update documentation
6. Submit pull request

### **Code Review Checklist**
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed

### **Commit Message Format**
```
feat: add group chat functionality
fix: resolve encryption key generation issue
docs: update deployment guide
test: add Web3 integration tests
```

---

## **📚 Resources**

### **Documentation**
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Viem Documentation](https://viem.sh)
- [Wagmi Documentation](https://wagmi.sh)

### **Web3 Resources**
- [Ethereum Developer Resources](https://ethereum.org/developers)
- [IPFS Documentation](https://docs.ipfs.io)
- [Web3.Storage Documentation](https://web3.storage/docs)

### **Security Resources**
- [OpenZeppelin Security](https://docs.openzeppelin.com/contracts/security)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices)

---

## **🎯 Roadmap**

### **Short Term**
- [ ] Mobile app development
- [ ] Voice message support
- [ ] Advanced group features
- [ ] Message search functionality

### **Long Term**
- [ ] Cross-chain support
- [ ] NFT profile pictures
- [ ] Decentralized identity
- [ ] Advanced privacy features

---

**Happy coding! 🚀**
