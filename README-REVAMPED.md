# We3Chat - Revamped Real-Time Messaging Platform

A production-ready decentralized chat application with real-time messaging, Web3 authentication, and dynamic data integration.

## 🚀 What's New in This Revamp

### ✅ **Removed All Mock Data**
- Eliminated `mockDatabase.ts` and all localStorage-based mock implementations
- Replaced with real API calls to backend services
- All data now flows from MongoDB through Express.js API

### ✅ **Real Authentication System**
- Wallet-based authentication with signature verification
- JWT token management with proper session handling
- Automatic WebSocket connection on successful authentication
- Real user profile management

### ✅ **Real-Time Messaging**
- WebSocket integration for instant messaging
- Message status tracking (pending → confirmed → failed)
- Typing indicators and user presence
- Optimistic UI updates for smooth UX

### ✅ **Dynamic Data Integration**
- All conversations and messages loaded from database
- Real-time updates via WebSocket connections
- Proper error handling and loading states
- Live conversation management

## 🏗️ Architecture

```
Frontend (Next.js + React)
├── Real-time UI with WebSocket integration
├── Wallet authentication (MetaMask)
├── Dynamic data loading from API
└── Optimistic UI updates

Backend (Express.js + Socket.IO)
├── REST API for CRUD operations
├── WebSocket server for real-time features
├── MongoDB for data persistence
└── JWT authentication

Database (MongoDB)
├── Users and profiles
├── Conversations and messages
├── Real-time message status
└── User presence tracking
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Wagmi** - Web3 wallet integration
- **React Hooks** - State management

### Backend
- **Express.js** - REST API server
- **Socket.IO** - WebSocket server
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Ethers.js** - Blockchain integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- MetaMask wallet

### 1. Clone and Install
```bash
git clone <repository-url>
cd we3chat
npm install
cd backend && npm install && cd ..
```

### 2. Environment Setup
```bash
# Frontend environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Backend environment  
cp backend/env.example backend/.env
# Edit backend/.env with your MongoDB URL and JWT secret
```

### 3. Start Development
```bash
# Option 1: Use the startup script
./start-dev.sh

# Option 2: Start manually
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **WebSocket**: ws://localhost:5000

## 🔧 Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
MONGODB_URL=mongodb://localhost:27017/we3chat
JWT_SECRET=your_jwt_secret_here
ENABLE_BLOCKCHAIN_MESSAGING=true
ENABLE_IPFS_STORAGE=true
ENABLE_SIWE_AUTH=true
ENABLE_REAL_TIME_SYNC=true
```

## 📱 Features

### Authentication
- **Wallet Connection** - MetaMask integration
- **Signature Verification** - Secure authentication
- **Session Management** - JWT-based sessions
- **Auto-reconnection** - Persistent sessions

### Real-Time Messaging
- **Instant Messages** - WebSocket delivery
- **Message Status** - Pending, confirmed, failed
- **Typing Indicators** - Real-time typing status
- **User Presence** - Online/offline status
- **Message History** - Persistent message storage

### User Experience
- **Optimistic Updates** - Immediate UI feedback
- **Error Handling** - Graceful error recovery
- **Loading States** - Visual feedback
- **Responsive Design** - Mobile-friendly interface

## 🔌 API Endpoints

### Authentication
- `GET /api/auth/nonce` - Get authentication nonce
- `POST /api/auth/verify` - Verify wallet signature
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile/:address` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search` - Search users
- `GET /api/users/friends` - Get friends list

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation details
- `PUT /api/conversations/:id/read` - Mark as read

### Messages
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

## 🔌 WebSocket Events

### Client → Server
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `update_presence` - Update user presence

### Server → Client
- `new_message` - New message received
- `message_updated` - Message status updated
- `user_typing` - User typing indicator
- `user_presence_updated` - User presence changed
- `conversation_joined` - Joined conversation
- `error` - Error occurred

## 🧪 Testing

### Run Integration Tests
```bash
node test-integration.js
```

### Test Coverage
- ✅ Health check endpoint
- ✅ Authentication flow
- ✅ API endpoints availability
- ✅ WebSocket connection
- ✅ Frontend build

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Heroku/DigitalOcean)
```bash
cd backend
npm run build
npm start
```

### Environment Variables
Set the following in your deployment platform:
- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed frontend origins

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **CORS Protection** - Cross-origin request security
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Data sanitization
- **Error Handling** - No sensitive data leakage

## 📊 Performance

- **Real-time Updates** - WebSocket for instant messaging
- **Optimistic UI** - Immediate user feedback
- **Efficient Queries** - MongoDB optimization
- **Connection Pooling** - Database performance
- **Compression** - Response size optimization

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify WebSocket URL
   - Check authentication token

2. **Database Connection Error**
   - Verify MongoDB URL
   - Check network connectivity
   - Ensure database is running

3. **Authentication Issues**
   - Check JWT secret
   - Verify wallet connection
   - Check signature format

### Debug Mode
```bash
# Backend debug
cd backend
DEBUG=* npm run dev

# Frontend debug
NEXT_PUBLIC_DEBUG=true npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Success!

Your We3Chat application is now running with:
- ✅ Real data integration
- ✅ Real-time messaging
- ✅ Web3 authentication
- ✅ Production-ready architecture

Happy chatting! 🚀
