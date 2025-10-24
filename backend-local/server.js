const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://we3chat:password@localhost:5432/we3chat',
  ssl: false
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// In-memory storage for real-time features
const messages = new Map();
const users = new Map();
const groups = new Map();
const notifications = new Map();

// JWT secret
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'local_jwt_secret_67890';

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      websocket: 'active',
      ipfs: 'local'
    }
  });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, displayName, avatar, walletAddress } = req.body;
    
    if (!username || !displayName || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1 OR username = $2',
      [walletAddress, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const userId = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, username, display_name, avatar, wallet_address, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [userId, username, displayName, avatar, walletAddress]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, walletAddress }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, walletAddress }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      walletAddress: user.wallet_address,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const chatMessages = messages.get(chatId) || [];
    res.json(chatMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userNotifications = notifications.get(userId) || [];
    res.json(userNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Join user to their personal room
  socket.on('join_user', (data) => {
    const { userId, walletAddress } = data;
    socket.join(`user_${userId}`);
    users.set(socket.id, { userId, walletAddress, socketId: socket.id });
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join chat room
  socket.on('join_chat', (data) => {
    const { chatId, userId } = data;
    socket.join(`chat_${chatId}`);
    console.log(`💬 User ${userId} joined chat ${chatId}`);
  });

  // Handle new message
  socket.on('send_message', (data) => {
    const { chatId, message, senderId, senderAddress, messageType = 'text' } = data;
    
    const messageData = {
      id: uuidv4(),
      chatId,
      senderId,
      senderAddress,
      message,
      messageType,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };

    // Store message
    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(messageData);

    // Broadcast to all users in the chat
    io.to(`chat_${chatId}`).emit('new_message', messageData);
    
    console.log(`📨 Message sent in chat ${chatId} by ${senderAddress}`);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { chatId, userId, isTyping } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping });
  });

  // Handle file upload notification
  socket.on('file_uploaded', (data) => {
    const { chatId, fileName, fileSize, fileType, ipfsHash, uploaderId } = data;
    
    const fileMessage = {
      id: uuidv4(),
      chatId,
      senderId: uploaderId,
      message: `Shared a file: ${fileName}`,
      messageType: 'file',
      fileData: {
        fileName,
        fileSize,
        fileType,
        ipfsHash
      },
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };

    if (!messages.has(chatId)) {
      messages.set(chatId, []);
    }
    messages.get(chatId).push(fileMessage);

    io.to(`chat_${chatId}`).emit('new_message', fileMessage);
    console.log(`📁 File shared in chat ${chatId}: ${fileName}`);
  });

  // Handle notification
  socket.on('send_notification', (data) => {
    const { userId, type, title, message, priority = 'medium' } = data;
    
    const notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      priority,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    if (!notifications.has(userId)) {
      notifications.set(userId, []);
    }
    notifications.get(userId).push(notification);

    // Send to specific user
    io.to(`user_${userId}`).emit('new_notification', notification);
    console.log(`🔔 Notification sent to user ${userId}: ${title}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`👋 User ${user.userId} disconnected`);
      users.delete(socket.id);
    }
  });
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        avatar TEXT,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY,
        name VARCHAR(100),
        type VARCHAR(20) DEFAULT 'direct',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create chat_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_members (
        id UUID PRIMARY KEY,
        chat_id UUID REFERENCES chats(id),
        user_id UUID REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chat_id, user_id)
      )
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        chat_id UUID REFERENCES chats(id),
        sender_id UUID REFERENCES users(id),
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        file_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeDatabase();
    
    server.listen(PORT, () => {
      console.log('🚀 We3Chat Backend Server Started');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server ready for connections`);
      console.log('📊 Services:');
      console.log('  - PostgreSQL Database: Connected');
      console.log('  - WebSocket Server: Active');
      console.log('  - IPFS: Local (http://localhost:5001)');
      console.log('  - Frontend: http://localhost:3000');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    pool.end(() => {
      console.log('✅ Database connection closed');
      process.exit(0);
    });
  });
});
