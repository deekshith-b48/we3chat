# We3Chat - Decentralized Chat Application

![We3Chat Logo](https://img.shields.io/badge/We3Chat-Decentralized%20Chat-blue?style=for-the-badge&logo=ethereum)
![IPFS](https://img.shields.io/badge/IPFS-Decentralized%20Storage-orange?style=for-the-badge&logo=ipfs)
![Web3](https://img.shields.io/badge/Web3-Ready-green?style=for-the-badge&logo=ethereum)

A next-generation decentralized chat application with full Web3 integration, IPFS storage, and real-time messaging capabilities.

## 🌟 Features

### 🔐 **Web3 Authentication**
- Wallet-based authentication using SIWE (Sign-In with Ethereum)
- Support for MetaMask, WalletConnect, and other Web3 wallets
- Secure JWT token management

### 📦 **Free IPFS Storage**
- **Pinata Integration** - 1GB free storage per month
- **Public Gateway Fallback** - Unlimited storage (non-persistent)
- **Local Storage Backup** - Device-based fallback
- **Automatic Failover** - Seamless provider switching

### 💬 **Real-time Messaging**
- WebSocket-based real-time communication
- Message encryption and decryption
- Typing indicators and presence status
- Message status tracking (sent, delivered, read)

### 🎨 **Modern UI/UX**
- Built with React 18 and Next.js 14
- Tailwind CSS for styling
- Responsive design for all devices
- Dark/light mode support

### 🔧 **Developer Experience**
- Full TypeScript support
- Comprehensive error handling
- Hot reload development
- Production-ready build system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Web3 wallet (MetaMask recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/we3chat.git
cd we3chat

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# IPFS Configuration (Optional - works without)
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key

# Feature Flags
NEXT_PUBLIC_ENABLE_IPFS=true
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true
```

## 📁 Project Structure

```
we3chat/
├── src/                    # Frontend source code
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── utils/            # Helper functions
├── backend/              # Backend API server
│   ├── src/              # TypeScript source
│   ├── routes/           # API routes
│   └── services/         # Business logic
├── contracts/            # Smart contracts
├── docs/                 # Documentation
└── public/               # Static assets
```

## 🔧 Configuration

### IPFS Setup (Optional)

For enhanced IPFS functionality, configure Pinata:

1. Sign up at [Pinata.cloud](https://pinata.cloud/)
2. Get your API keys from the dashboard
3. Add them to your `.env.local` file

### Web3 Configuration

The app automatically detects your Web3 wallet. No additional configuration needed!

## 📚 Documentation

- [IPFS Setup Guide](IPFS_SETUP_GUIDE.md) - Configure IPFS storage
- [Web3 Setup Guide](WEB3_SETUP_GUIDE.md) - Web3 integration details
- [Quick Start Guide](QUICK_START.md) - Get started quickly
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Deploy to production

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start frontend development server
npm run build        # Build for production
npm run start        # Start production server

# Backend
cd backend
npm run dev          # Start backend development server
npm run build        # Build backend
npm run start        # Start backend production server
```

### Tech Stack

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Wagmi (Web3)
- Socket.io Client

**Backend:**
- Express.js
- TypeScript
- Socket.io
- JWT Authentication
- IPFS Integration

**Storage:**
- IPFS (Pinata + Public Gateways)
- Local Storage (fallback)

## 🌐 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables
3. Deploy automatically

### Backend (Railway/Heroku)

1. Connect your repository
2. Set environment variables
3. Deploy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [IPFS](https://ipfs.io/) - Decentralized storage
- [Pinata](https://pinata.cloud/) - IPFS pinning service
- [Ethereum](https://ethereum.org/) - Blockchain platform
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📞 Support

- Create an issue for bug reports
- Start a discussion for questions
- Check the documentation for guides

---

**Built with ❤️ for the decentralized web**

[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/we3chat?style=social)](https://github.com/YOUR_USERNAME/we3chat)
[![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/we3chat?style=social)](https://github.com/YOUR_USERNAME/we3chat)
[![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/we3chat)](https://github.com/YOUR_USERNAME/we3chat/issues)