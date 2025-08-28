# we3chat - Decentralized Web3 Messaging Platform

A fully decentralized, end-to-end encrypted messaging platform built on blockchain technology with IPFS storage.

## 🚀 Features

### Core Functionality
- **End-to-End Encryption**: Messages encrypted using X25519 + AES-GCM
- **Blockchain Storage**: Message metadata stored on Polygon smart contracts
- **IPFS Integration**: Encrypted message content stored on IPFS
- **Real-time Messaging**: Live updates via blockchain event listening
- **Wallet Authentication**: Connect with MetaMask, WalletConnect, etc.
- **Friend System**: On-chain friend verification and management

### Security & Privacy
- **Client-side Encryption**: Private keys never leave your device
- **Decentralized Storage**: No central servers or data collection
- **Verifiable Messages**: All messages cryptographically verifiable
- **Open Source**: Fully transparent and auditable code

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **Zustand** - Lightweight state management

### Web3 Integration
- **wagmi** - React hooks for Ethereum
- **ethers.js** - Ethereum library
- **RainbowKit** - Wallet connection UI
- **Polygon Amoy** - Layer 2 blockchain network

### Encryption & Storage
- **tweetnacl** - X25519 key exchange + cryptography
- **Web3.Storage** - IPFS pinning service
- **Browser Storage** - Local key management

## 🏗 Architecture

### Data Flow
1. **Message Sending**:
   - Encrypt message with recipient's public key
   - Upload encrypted payload to IPFS → get CID
   - Compute CID hash and store on blockchain
   - Real-time notification via blockchain events

2. **Message Receiving**:
   - Listen for blockchain events
   - Fetch encrypted payload from IPFS using CID
   - Decrypt using local private key
   - Display in chat interface

3. **Friend Management**:
   - Add friends via Ethereum address
   - Mutual verification through smart contracts
   - Public key exchange for encryption

## 📋 Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Polygon Amoy testnet MATIC tokens

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file:

```bash
# Smart Contract (deploy your own or use existing)
NEXT_PUBLIC_CHAT_ADDRESS=0x1234567890123456789012345678901234567890

# IPFS Storage (get free token from web3.storage)
NEXT_PUBLIC_WEB3STORAGE_TOKEN=your_web3_storage_token

# Wallet Connect (get free project ID)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Custom RPC
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

### 4. Setup Wallet

1. Install MetaMask browser extension
2. Add Polygon Amoy testnet:
   - Network Name: Polygon Amoy
   - RPC URL: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Currency: MATIC
   - Explorer: https://amoy.polygonscan.com

3. Get testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology/)

## 🔧 Configuration

### Smart Contract Deployment

Deploy the ChatApp smart contract to Polygon Amoy:

```solidity
// Key contract functions:
- createAccount(username, publicKey) - Register user
- addFriend(friendAddress) - Add friend
- sendMessage(to, cidHash, cid) - Send encrypted message
- readMessage(other) - Get conversation history
```

### IPFS Storage Setup

1. Sign up at [Web3.Storage](https://web3.storage)
2. Create API token
3. Add token to environment variables

## 🔐 Security Features

### Encryption Process
1. **Key Generation**: X25519 keypair generated locally
2. **Key Exchange**: Public keys stored on blockchain
3. **Message Encryption**: Derive shared secret → HKDF → AES-GCM
4. **Storage**: Only encrypted data stored on IPFS

### Privacy Guarantees
- Private keys never transmitted or stored remotely
- Message content never visible to third parties
- Metadata minimization on blockchain
- No central authority can access conversations

## 🏃‍♂️ Usage Guide

### Getting Started
1. **Connect Wallet** - Connect MetaMask to Polygon Amoy
2. **Create Account** - Choose username and generate encryption keys
3. **Add Friends** - Search by Ethereum address
4. **Start Chatting** - Send end-to-end encrypted messages

### Adding Friends
- Enter friend's Ethereum address
- They must have a we3chat account
- Both parties must add each other for full friendship

### Sending Messages
- Select friend from sidebar
- Type message and press Enter
- Message automatically encrypted and stored on IPFS
- Transaction confirmed on blockchain

## 🔍 Troubleshooting

### Common Issues

**Wallet Connection Issues**
- Ensure MetaMask is installed and unlocked
- Switch to Polygon Amoy network
- Check you have testnet MATIC for transactions

**Message Sending Fails**
- Verify friend has set up encryption key
- Check IPFS storage token is valid
- Ensure sufficient MATIC for gas fees

**Decryption Errors**
- Friend must have valid public key on-chain
- Both parties must have compatible encryption setup
- Try refreshing and reloading conversation

### Getting Help
- Check browser console for error messages
- Verify all environment variables are set
- Test encryption with built-in crypto test tool

## 📚 Development

### Key Components
- `src/lib/crypto.ts` - Encryption/decryption logic
- `src/lib/ipfs.ts` - IPFS storage integration  
- `src/hooks/use-messaging.ts` - Message sending/receiving
- `src/components/ChatArea.tsx` - Main chat interface

### Build for Production
```bash
npm run build
npm start
```

### Testing Encryption
Use the built-in crypto test in Profile → Security tab to verify encryption is working correctly.

## 🌐 Deployment

Deploy to Vercel, Netlify, or any platform supporting Next.js:

```bash
npm run build
```

Set environment variables in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Live Demo](https://we3chat.vercel.app) (Coming Soon)
- [Smart Contract](https://amoy.polygonscan.com/address/CONTRACT_ADDRESS)
- [Documentation](https://docs.we3chat.com) (Coming Soon)

---

**Built with ❤️ by the we3chat team**

*The future of messaging is decentralized*
