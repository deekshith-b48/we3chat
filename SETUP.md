# 🚀 We3Chat - Complete Setup Guide

This guide will help you set up and run the complete We3Chat application with frontend, backend, and smart contract integration.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or Atlas)
- **Hardhat** for smart contract deployment
- **Polygon Amoy** testnet account with MATIC
- **Web3.Storage** account for IPFS
- **WalletConnect** project ID (optional)

---

## 🔧 Quick Start

### 1. Clone and Install Dependencies

```bash
cd /home/deekshi484/Documents/we3chat

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install contract dependencies
cd ../contracts
npm install

cd ..
```

### 2. Set Up Environment Variables

#### Frontend Environment (`.env.local`)

```bash
cp env.example .env.local
```

Edit `.env.local` with your values:

```env
# Web3 Configuration
NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000

# IPFS Configuration
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token

# Development Settings
NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true
```

#### Backend Environment (`.env`)

```bash
cd backend
cp env.example .env
```

Edit `backend/.env` with your values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/we3chat

# JWT Configuration
SIWE_JWT_SECRET=your-super-long-random-string-at-least-32-characters
SIWE_JWT_EXPIRES=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
CHAT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
CHAIN_ID=80002

# IPFS Configuration
WEB3STORAGE_TOKEN=your_web3_storage_token

# Feature Flags
ENABLE_BLOCKCHAIN_MESSAGING=true
ENABLE_IPFS_STORAGE=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_SIWE_AUTH=true

# Logging
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=true
```

### 3. Deploy Smart Contract

```bash
cd contracts

# Deploy to Polygon Amoy testnet
npm run deploy:amoy

# Copy the deployed contract address to your .env files
# Example output: ChatApp deployed to: 0x1234567890123456789012345678901234567890
```

### 4. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud database
# Just update MONGODB_URI in backend/.env
```

### 5. Start Backend Server

```bash
cd backend

# Start development server
npm run dev

# Backend should be running on http://localhost:5000
```

### 6. Start Frontend

```bash
# In the project root
npm run dev

# Frontend should be running on http://localhost:3000
```

---

## ✅ Verification Checklist

### Backend Running
- [ ] Backend server starts without errors
- [ ] Health check works: `curl http://localhost:5000/health`
- [ ] Database connection successful
- [ ] Socket.IO server listening on port 5000

### Frontend Running
- [ ] Frontend loads without errors
- [ ] Can connect wallet
- [ ] Can register profile
- [ ] Can see friends list (when you have friends)
- [ ] WebSocket connection established

### Integration Working
- [ ] Frontend can discover users via `/api/users/discover`
- [ ] Frontend can search users via `/api/users/search`
- [ ] Socket.IO events working for real-time messaging
- [ ] Friend requests can be sent and accepted
- [ ] Messages are sent and received in real-time

---

## 🎯 Usage Flow

### First Time Setup

1. **Start MongoDB** (if local)
2. **Start Backend**: `cd backend && npm run dev`
3. **Start Frontend**: `npm run dev`
4. **Deploy Smart Contract**: `cd contracts && npm run deploy:amoy`
5. **Update Environment**: Add contract address to `.env.local` and `backend/.env`

### Daily Usage

1. **Start MongoDB** (if not already running)
2. **Start Backend**: `cd backend && npm run dev`
3. **Start Frontend**: `npm run dev`
4. **Open Browser**: Go to `http://localhost:3000`
5. **Connect Wallet**: Use MetaMask or other Web3 wallet
6. **Register Profile**: Enter username and register on-chain
7. **Discover Users**: Click 🔍 to find other We3Chat users
8. **Add Friends**: Send friend requests
9. **Start Chatting**: Click on a friend to start conversation

---

## 🔍 Testing Features

### Test User Discovery
```bash
# Open browser console and check:
# 1. Network tab shows request to /api/users/discover
# 2. Response contains array of users
# 3. User cards display correctly
```

### Test Friend Requests
```bash
# 1. Click "Discover Users"
# 2. Click "Add Friend" on a user
# 3. Check backend logs for friend request creation
# 4. Open "Friend Requests" modal
# 5. Accept/reject requests
```

### Test Messaging
```bash
# 1. Select a friend in sidebar
# 2. Type a message
# 3. Press Enter to send
# 4. Check backend logs for message creation
# 5. Message should appear in real-time
```

### Test Socket.IO Connection
```bash
# 1. Open browser console
# 2. Should see "✅ Realtime service connected"
# 3. Backend logs should show "User <address> connected"
# 4. Send message to test real-time delivery
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Problem**: MongoDB connection failed

**Solution**:
```bash
# Check MongoDB is running
mongosh
# Should connect successfully

# If not running:
sudo systemctl start mongod
# Or start manually: mongod
```

### Frontend Can't Connect to Backend

**Problem**: CORS errors or connection refused

**Solution**:
- Check backend is running on port 5000
- Verify `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
- Check CORS settings in `backend/.env`

### Socket.IO Connection Fails

**Problem**: "Authentication required" error

**Solution**:
- Ensure you've connected your wallet
- Check browser console for wallet connection errors
- Verify `NEXT_PUBLIC_WS_URL` in `.env.local`
- Check backend logs for authentication errors

### Users Not Appearing

**Problem**: `/api/users/discover` returns empty array

**Solution**:
- Check MongoDB has users in database
- Verify users have `isRegistered: true`
- Check backend logs for query errors
- Test with: `mongosh we3chat --eval "db.users.find()"`

### Messages Not Sending

**Problem**: Messages stuck in "sending" status

**Solution**:
- Check WebSocket connection status
- Verify contract address is correct
- Check backend logs for message creation errors
- Test endpoint: `curl http://localhost:5000/api/messages`

---

## 📚 API Endpoints

### User Endpoints

- `GET /api/users/discover` - Get all registered users
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/profile/:address` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/friends` - Get friends list
- `GET /api/users/friend-requests` - Get pending requests
- `POST /api/users/friends/request` - Send friend request
- `PUT /api/users/friends/:id` - Accept/reject request

### Conversation Endpoints

- `GET /api/conversations` - Get user's conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/conversations` - Create conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Message Endpoints

- `GET /api/messages?conversationId=:id` - Get messages
- `POST /api/messages` - Create message
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

---

## 🌐 WebSocket Events

### Client → Server

- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `update_message_status` - Update message status

### Server → Client

- `new_message` - New message received
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `message_updated` - Message status updated
- `conversation_joined` - Confirmed join
- `conversation_left` - Confirmed leave
- `error` - Error occurred

---

## 🚀 Production Deployment

See `DEPLOYMENT_GUIDE.md` for production deployment instructions.

---

## 📞 Need Help?

- Check logs in terminal for errors
- Check browser console for frontend errors  
- Check backend logs for API errors
- Verify all environment variables are set
- Ensure MongoDB is accessible
- Test endpoints with curl

---

## ✨ You're All Set!

Your We3Chat application should now be running with:
- ✅ Frontend on http://localhost:3000
- ✅ Backend on http://localhost:5000
- ✅ Database connected
- ✅ WebSocket real-time messaging
- ✅ User discovery and friend management
- ✅ Complete chat functionality

Happy chatting! 💬

