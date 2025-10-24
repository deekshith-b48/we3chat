# 🆓 We3Chat FREE Setup Guide

## **Complete FREE Setup Using Only Open-Source Tools**

This guide shows you how to run We3Chat using **100% FREE** alternatives to all paid services. No API keys, no monthly fees, no credit cards required!

## 🎯 **What You Get**

- **$0 Cost**: Completely free to run
- **Full Control**: Your own infrastructure
- **Privacy**: Data stays on your machine
- **Learning**: Understand how everything works
- **Customizable**: Modify as needed

## 🛠️ **FREE Alternatives Used**

| **Service** | **Paid Alternative** | **FREE Alternative** |
|-------------|---------------------|---------------------|
| Web3.Storage | $0.15/GB | Local IPFS Desktop |
| Supabase | $25/month | Local PostgreSQL + Express |
| WalletConnect | $99/month | Direct wallet connection |
| Infura | $50/month | Free public RPCs |
| Alchemy | $200/month | Free public RPCs |

## 🚀 **Quick Start (Automated)**

### **Option 1: One-Command Setup**
```bash
cd /home/deekshi484/Downloads/we3chat
chmod +x setup-free.sh
./setup-free.sh
```

### **Option 2: Manual Setup**
Follow the step-by-step instructions below.

## 📋 **Prerequisites**

- **Node.js** 18+ (https://nodejs.org/)
- **Git** (https://git-scm.com/)
- **MetaMask** browser extension
- **Linux/macOS** (Windows users can use WSL)

## 🔧 **Step-by-Step Setup**

### **Step 1: Install Dependencies**
```bash
# Install Node.js dependencies
npm install --legacy-peer-deps

# Install IPFS globally
npm install -g ipfs

# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Install PostgreSQL (macOS)
brew install postgresql
```

### **Step 2: Setup Database**
```bash
# Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Create database and user
sudo -u postgres createdb we3chat
sudo -u postgres psql -c "CREATE USER we3chat WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE we3chat TO we3chat;"
```

### **Step 3: Setup IPFS**
```bash
# Initialize IPFS
ipfs init

# Start IPFS daemon (in separate terminal)
ipfs daemon
```

### **Step 4: Setup Backend**
```bash
# Install backend dependencies
cd backend-local
npm install
cd ..

# Start backend server (in separate terminal)
cd backend-local
node server.js
```

### **Step 5: Deploy Smart Contracts**
```bash
# Install OpenZeppelin contracts
npm install @openzeppelin/contracts

# Compile contracts
npm run contract:compile

# Deploy contracts (optional for testing)
npm run contract:deploy
```

### **Step 6: Start Frontend**
```bash
# Start the application
npm run dev
```

## 🌐 **Access Your Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **IPFS Gateway**: http://localhost:5001
- **Health Check**: http://localhost:3001/health

## 🔑 **Environment Configuration**

Create `.env.local` with these FREE settings:

```env
# Application
NEXT_PUBLIC_APP_NAME=We3Chat
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Blockchain Configuration (FREE)
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CHAT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=free

# Local Database (FREE)
DATABASE_URL=postgresql://we3chat:password@localhost:5432/we3chat
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=local_anon_key

# Local IPFS (FREE)
NEXT_PUBLIC_IPFS_HTTP_URL=http://localhost:5001/api/v0
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=not_needed

# Real-time Messaging (FREE)
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_REALTIME_SERVER_URL=http://localhost:3001

# Security (Generate locally)
NEXT_PUBLIC_ENCRYPTION_KEY=local_encryption_key_12345
NEXT_PUBLIC_JWT_SECRET=local_jwt_secret_67890

# Development
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
```

## 🎮 **How to Use**

### **1. Connect Your Wallet**
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve the connection

### **2. Switch to Testnet**
1. Open MetaMask
2. Click network dropdown
3. Add Polygon Amoy testnet:
   - Network Name: Polygon Amoy
   - RPC URL: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Currency Symbol: MATIC
   - Block Explorer: https://amoy.polygonscan.com

### **3. Get Test MATIC**
1. Go to https://faucet.polygon.technology/
2. Select "Amoy Testnet"
3. Enter your wallet address
4. Request test MATIC tokens

### **4. Start Chatting**
1. Create a new chat or group
2. Send messages, files, and media
3. All data is stored locally on your IPFS node

## 🛠️ **Troubleshooting**

### **IPFS Not Starting**
```bash
# Check if IPFS is running
ipfs version

# Reset IPFS if needed
rm -rf ~/.ipfs
ipfs init
ipfs daemon
```

### **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Restart PostgreSQL
sudo systemctl restart postgresql  # Linux
brew services restart postgresql  # macOS
```

### **Backend Server Issues**
```bash
# Check if port 3001 is available
lsof -i :3001

# Kill process if needed
pkill -f "node server.js"
```

### **Frontend Build Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📊 **Service Status Check**

### **Check All Services**
```bash
# Check IPFS
curl http://localhost:5001/api/v0/version

# Check Backend
curl http://localhost:3001/health

# Check Database
psql -h localhost -U we3chat -d we3chat -c "SELECT version();"
```

## 🔒 **Security Notes**

- **Local Only**: This setup only works on your local machine
- **No Internet Access**: Other users can't access your instance
- **Data Privacy**: All data stays on your machine
- **Testnet Only**: Uses testnet tokens (no real money)

## 🚀 **Production Deployment**

For production deployment, you'll need:
1. **VPS/Cloud Server**: DigitalOcean, AWS, etc.
2. **Domain Name**: For public access
3. **SSL Certificate**: For HTTPS
4. **Database Backup**: Regular backups
5. **IPFS Cluster**: For redundancy

## 💡 **Benefits of FREE Setup**

- **$0 Monthly Cost**: No recurring fees
- **Full Control**: Complete ownership of your data
- **Learning Experience**: Understand the technology
- **Customizable**: Modify as needed
- **Privacy**: Data never leaves your machine
- **Offline Capable**: Works without internet

## ⚠️ **Limitations**

- **Local Only**: Not accessible from internet
- **Manual Setup**: Requires technical knowledge
- **No Backup**: Data stored locally only
- **Performance**: May be slower than cloud services
- **Maintenance**: You manage all services

## 🆘 **Getting Help**

### **Common Issues**
1. **Port Conflicts**: Make sure ports 3000, 3001, 5001 are free
2. **Permission Issues**: Use `sudo` for system-level commands
3. **Node Version**: Ensure Node.js 18+ is installed
4. **Database Access**: Check PostgreSQL user permissions

### **Debug Mode**
```bash
# Enable debug logging
NEXT_PUBLIC_DEBUG=true npm run dev
```

### **Reset Everything**
```bash
# Stop all services
./stop-free.sh

# Reset database
sudo -u postgres psql -c "DROP DATABASE we3chat;"
sudo -u postgres psql -c "CREATE DATABASE we3chat;"

# Reset IPFS
rm -rf ~/.ipfs
ipfs init

# Restart everything
./start-free.sh
```

## 🎉 **Success!**

You now have a fully functional We3Chat application running completely FREE on your local machine!

**Next Steps:**
1. Explore the features
2. Create test chats and groups
3. Upload files and test IPFS
4. Customize the interface
5. Deploy to production when ready

---

**Total Cost: $0**  
**Setup Time: ~15 minutes**  
**Technical Level: Intermediate**  
**Maintenance: Self-managed**
