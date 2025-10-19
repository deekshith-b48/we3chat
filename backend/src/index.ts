import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { ENV, validateEnv, getEnvInfo } from './env.js';
import { basicAuthRouter } from './routes/basic-auth.js';
import usersRouter from './routes/users.js';
import conversationsRouter from './routes/conversations.js';
import messagesRouter from './routes/messages.js';
import { authOptional, authLogger } from './middleware/auth.js';
import { setupSocketHandlers } from './socket/index.js';
import { connectToDatabase, closeDatabaseConnection } from './db/index.js';

// Initialize logger
const logger = pino({ 
  level: ENV.LOG_LEVEL,
  ...(ENV.LOG_FORMAT === 'json' ? {} : { transport: { target: 'pino-pretty' } })
});

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: ENV.CORS_ORIGIN === '*' ? true : ENV.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
if (ENV.ENABLE_COMPRESSION) {
  app.use(compression());
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  max: ENV.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Authentication middleware (optional for all routes)
app.use(authOptional);

// Request logging middleware
if (ENV.ENABLE_DEBUG_LOGS) {
  app.use(authLogger);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: getEnvInfo(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN === '*' ? true : ENV.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set up Socket.IO handlers
setupSocketHandlers(io);

// API routes
app.use('/api/auth', basicAuthRouter);
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id || 'anonymous'
  });
  
  // Don't leak error details in production
  const isDevelopment = ENV.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Start server
server.listen(ENV.PORT, async () => {
  // Connect to database
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    logger.error('Failed to connect to database, shutting down...');
    process.exit(1);
  }

  logger.info({
    message: 'We3Chat Server started',
    port: ENV.PORT,
    environment: ENV.NODE_ENV,
    features: {
      blockchain: ENV.ENABLE_BLOCKCHAIN_MESSAGING,
      ipfs: ENV.ENABLE_IPFS_STORAGE,
      siwe: ENV.ENABLE_SIWE_AUTH,
      realtime: ENV.ENABLE_REAL_TIME_SYNC,
      websocket: true,
      database: true
    }
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(async () => {
    await closeDatabaseConnection();
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { app, server, io };