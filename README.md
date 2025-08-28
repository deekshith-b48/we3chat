# we3chat - Production-Ready Decentralized Messaging

A complete transformation from mock data to a production-ready decentralized messaging application with real-time features, blockchain integration, and modern architecture.

## 🚀 What's New - Production Features

### ✅ **Authentication System**
- **Sign-In with Ethereum (EIP-4361)** - Secure, passwordless authentication
- **JWT-based sessions** - Scalable token management
- **Automatic wallet connection** - Seamless user experience

### ✅ **Backend Infrastructure**
- **PostgreSQL Database** - Robust data storage with Drizzle ORM
- **REST API** - Complete CRUD operations for users, conversations, messages
- **Socket.io Real-time** - Instant messaging with presence indicators
- **Rate limiting & Security** - Production-ready safeguards

### ✅ **Dynamic Data & Real-time**
- **Live friends list** - API-driven friend management
- **Real-time messaging** - Instant message delivery via WebSockets
- **Presence system** - Online/offline status tracking
- **Typing indicators** - Enhanced user experience

### ✅ **Hybrid Architecture**
- **API-first approach** - Fast, reliable messaging via database
- **Blockchain integration** - Optional on-chain message storage with IPFS
- **Flexible deployment** - Works with or without smart contracts

## 🏗️ Architecture Overview

```
Frontend (Next.js + React)
├── Authentication (SIWE)
├── Real-time UI (Socket.io)
├── API Client (REST)
└── Wallet Integration (RainbowKit/Wagmi)

Backend (Node.js + Express)
├── REST API (Users, Conversations, Messages)
├── Socket.io Server (Real-time events)
├── Authentication (JWT + SIWE verification)
└── Database (PostgreSQL + Drizzle ORM)

Optional Blockchain Layer
├── Smart Contracts (Message storage)
├── IPFS (Encrypted content)
└── Transaction tracking
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- (Optional) Ethereum wallet for testing

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your database URL in .env
DATABASE_URL=postgresql://username:password@localhost:5432/we3chat

# Run database migrations
npm run migrate

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
# From root directory
npm install

# Copy environment configuration
cp .env.local.example .env.local

# Configure API URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000

# Start frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

### 3. Environment Configuration

**Backend (.env):**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/we3chat
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

## 📚 Key Features Implemented

### 🔐 **Authentication Flow**
1. User connects wallet (RainbowKit)
2. App generates SIWE message
3. User signs message with wallet
4. Backend verifies signature and issues JWT
5. Socket.io connection established for real-time features

### 💬 **Messaging System**
1. **API-based messaging** - Fast, reliable via PostgreSQL
2. **Real-time delivery** - Socket.io for instant updates
3. **Optional blockchain** - Store messages on-chain with IPFS
4. **Message status tracking** - Pending/confirmed/failed states

### 👥 **Friend Management**
1. **Search users** - By username or wallet address
2. **Send friend requests** - Mutual approval system
3. **Dynamic friends list** - API-driven with real-time updates
4. **Presence tracking** - Online/offline status

### 🔄 **Real-time Features**
- Instant message delivery
- Typing indicators
- Presence updates (online/offline)
- Connection status
- Message status updates

## 🌐 API Endpoints

### Authentication
- `GET /api/auth/nonce` - Get nonce for SIWE
- `POST /api/auth/verify` - Verify SIWE message
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile/:address` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/friends` - Get friends list
- `POST /api/users/friends/request` - Send friend request
- `GET /api/users/search` - Search users

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation details

### Messages
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Update message status

## 🔌 Socket.io Events

### Client → Server
- `join_conversation` - Join conversation room
- `send_message` - Send message via socket
- `typing_start/stop` - Typing indicators
- `update_presence` - Update online status

### Server → Client
- `new_message` - Receive new message
- `message_updated` - Message status update
- `user_typing` - Someone is typing
- `friend_presence_updated` - Friend status change

## 🚀 Deployment

### Database Setup (Production)
```bash
# Install PostgreSQL
# Create database
createdb we3chat

# Run migrations
npm run migrate
```

### Backend Deployment
```bash
# Build
npm run build

# Start production server
npm start
```

### Frontend Deployment
```bash
# Build
npm run build

# Start production server
npm start
```

### Environment Variables (Production)
- Set secure `JWT_SECRET`
- Configure production `DATABASE_URL`
- Set proper CORS origins
- Enable SSL for database connections

## 🔧 Development Scripts

**Backend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run migrate` - Run database migrations
- `npm test` - Run tests

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript check

## 📁 Project Structure

```
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── db/             # Database schema & migrations
│   │   ├── routes/         # API route handlers
│   │   ├── socket/         # Socket.io handlers
│   │   ├── middleware/     # Auth & other middleware
│   │   └── index.ts        # Main server file
│   └── package.json
│
├── src/                    # Frontend application
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility libraries
│   └── store/              # State management
│
├── package.json            # Frontend dependencies
└── README.md              # This file
```

## 🔐 Security Features

- **JWT-based authentication** - Secure session management
- **SIWE verification** - Cryptographic authentication
- **Rate limiting** - API abuse prevention
- **Input validation** - SQL injection prevention
- **CORS configuration** - Cross-origin security
- **Helmet.js** - Security headers

## 🎯 Next Steps & Enhancements

### Immediate Improvements
- [ ] Push notifications for new messages
- [ ] File/image sharing via IPFS
- [ ] Group chat functionality
- [ ] Message reactions and threads

### Advanced Features
- [ ] Voice/video calling integration
- [ ] Mobile app (React Native)
- [ ] Message search and indexing
- [ ] Backup/restore functionality

### Scaling Considerations
- [ ] Redis for session storage
- [ ] Message queue for background jobs
- [ ] CDN for file attachments
- [ ] Database read replicas

## 🛟 Troubleshooting

### Common Issues

**Backend won't start:**
- Check database connection
- Verify environment variables
- Ensure PostgreSQL is running

**Frontend can't connect:**
- Verify `NEXT_PUBLIC_API_URL`
- Check CORS configuration
- Ensure backend is running

**Socket.io issues:**
- Check authentication token
- Verify WebSocket support
- Check firewall settings

### Support
- Check logs in browser console
- Review backend server logs
- Verify environment configuration
- Test database connectivity

## 📄 License

MIT License - feel free to use this project as a foundation for your own decentralized messaging applications.
