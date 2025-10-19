# We3Chat - Next-Gen Decentralized Messaging

![We3Chat Logo](https://via.placeholder.com/400x100/3b82f6/ffffff?text=We3Chat)

> The future of messaging: Secure, encrypted, blockchain-powered, and fully decentralized chat platform with Web3 integration.

## 🚀 Features

### Core Messaging
- **End-to-End Encryption**: Messages are encrypted using advanced cryptographic protocols
- **Real-time Communication**: Instant messaging with WebSocket connections
- **Group Chats**: Create and manage group conversations with multiple participants
- **File Sharing**: Share images, videos, documents, and other files via IPFS
- **Message Status**: See when messages are sent, delivered, and read
- **Typing Indicators**: Know when someone is typing
- **Message Reactions**: React to messages with emojis
- **Message Threading**: Reply to specific messages in conversations

### Web3 Integration
- **Wallet Connection**: Connect with MetaMask, WalletConnect, Coinbase Wallet, and more
- **Blockchain Storage**: Messages and metadata stored on the blockchain
- **IPFS Integration**: Decentralized file storage and content distribution
- **Smart Contracts**: Custom Solidity contracts for chat functionality
- **NFT Sharing**: Share and display NFTs in conversations
- **Token Transfers**: Send cryptocurrency directly in chat
- **Decentralized Identity**: User profiles and authentication via blockchain

### Advanced Features
- **P2P Messaging**: Direct peer-to-peer communication using LibP2P
- **Offline Support**: Continue using the app even when offline
- **PWA Support**: Install as a native app on mobile and desktop
- **Dark/Light Theme**: Beautiful UI with theme switching
- **Responsive Design**: Works perfectly on all devices
- **Search**: Find messages and conversations quickly
- **Notifications**: Real-time push notifications
- **Voice Messages**: Record and send voice messages
- **Video Calls**: Make video calls directly in the app
- **Screen Sharing**: Share your screen during conversations

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

### Web3 & Blockchain
- **Ethers.js** - Ethereum library
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **Viem** - TypeScript interface for Ethereum
- **Hardhat** - Smart contract development
- **OpenZeppelin** - Smart contract libraries

### Decentralized Storage
- **IPFS** - InterPlanetary File System
- **Web3.Storage** - Decentralized storage service
- **LibP2P** - Peer-to-peer networking
- **Ceramic** - Decentralized data network

### Backend & Infrastructure
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Redis** - Caching and sessions
- **Socket.io** - Real-time communication
- **Express.js** - API server

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/we3chat/we3chat.git
   cd we3chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_CHAIN_ID=80002
   NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
   NEXT_PUBLIC_CHAT_ADDRESS=0xYourContractAddress
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
   ```

4. **Deploy smart contracts**
   ```bash
   # Install Hardhat dependencies
   npm install @openzeppelin/contracts

   # Compile contracts
   npm run contract:compile

   # Deploy to local network
   npm run contract:deploy
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### Getting Started
1. **Connect Wallet**: Click "Connect Wallet" and select your preferred wallet
2. **Authenticate**: Sign the message to authenticate with We3Chat
3. **Create Profile**: Set up your username, display name, and avatar
4. **Start Chatting**: Add friends and start conversations!

### Features Guide

#### Sending Messages
- Type your message in the input field
- Press Enter to send
- Use the attachment button to share files
- Long press on messages to see options

#### Group Chats
- Click "New Group" to create a group
- Add members by their wallet addresses
- Set group name and description
- Manage group settings and permissions

#### File Sharing
- Click the attachment button
- Select files from your device
- Files are automatically uploaded to IPFS
- Share with friends or in groups

#### Web3 Features
- View your wallet balance
- Send cryptocurrency in chat
- Share NFTs and view them inline
- Access decentralized storage

## 🔧 Development

### Project Structure
```
we3chat/
├── contracts/          # Smart contracts
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   ├── lib/           # Utilities and services
│   ├── hooks/         # Custom React hooks
│   └── types/         # TypeScript types
├── public/            # Static assets
└── docs/              # Documentation
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run contract:compile` - Compile smart contracts
- `npm run contract:deploy` - Deploy contracts
- `npm run contract:test` - Test contracts

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔒 Security

### Encryption
- All messages are encrypted end-to-end
- Private keys never leave your device
- Files are encrypted before IPFS upload
- Smart contracts use secure cryptographic functions

### Privacy
- No central server stores your messages
- Decentralized storage ensures data availability
- User identities are pseudonymous
- Optional metadata collection

### Best Practices
- Always verify smart contract addresses
- Keep your private keys secure
- Use hardware wallets for large amounts
- Regularly update your dependencies

## 🌐 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker
```bash
# Build Docker image
docker build -t we3chat .

# Run container
docker run -p 3000:3000 we3chat
```

### Manual Deployment
1. Build the application: `npm run build`
2. Start the production server: `npm run start`
3. Configure your web server (Nginx, Apache, etc.)
4. Set up SSL certificates
5. Configure environment variables

## 📊 Monitoring & Analytics

### Built-in Monitoring
- Real-time connection status
- Message delivery tracking
- Error logging and reporting
- Performance metrics

### Third-party Integration
- Sentry for error tracking
- Mixpanel for analytics
- LogRocket for session replay
- Google Analytics for web analytics

## 🤝 Community

- **Discord**: [Join our Discord](https://discord.gg/we3chat)
- **Twitter**: [@We3Chat](https://twitter.com/we3chat)
- **GitHub**: [GitHub Repository](https://github.com/we3chat/we3chat)
- **Documentation**: [docs.we3chat.com](https://docs.we3chat.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ethereum Foundation](https://ethereum.org) for the blockchain infrastructure
- [IPFS](https://ipfs.io) for decentralized storage
- [Supabase](https://supabase.com) for backend services
- [Vercel](https://vercel.com) for hosting and deployment
- [OpenZeppelin](https://openzeppelin.com) for smart contract libraries
- [RainbowKit](https://rainbowkit.com) for wallet connection UI

## 🐛 Bug Reports

Found a bug? Please report it on our [GitHub Issues](https://github.com/we3chat/we3chat/issues) page.

## 💡 Feature Requests

Have an idea for a new feature? We'd love to hear it! Submit your request on our [GitHub Discussions](https://github.com/we3chat/we3chat/discussions) page.

---

**Built with ❤️ by the We3Chat Team**

*The future of messaging is decentralized.*