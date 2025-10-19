import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function opt(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const ENV = {
  // Server Configuration
  PORT: parseInt(opt('PORT', '5000'), 10),
  NODE_ENV: opt('NODE_ENV', 'development'),
  
  // Supabase Configuration
  SUPABASE_URL: req('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE: req('SUPABASE_SERVICE_ROLE'),
  SUPABASE_ANON_KEY: opt('SUPABASE_ANON_KEY', ''),
  
  // JWT Configuration
  SIWE_JWT_SECRET: req('SIWE_JWT_SECRET'),
  SIWE_JWT_EXPIRES: opt('SIWE_JWT_EXPIRES', '7d'),
  
  // CORS Configuration
  CORS_ORIGIN: opt('CORS_ORIGIN', '*'),
  
  // Blockchain Configuration
  BLOCKCHAIN_RPC_URL: opt('BLOCKCHAIN_RPC_URL', 'https://rpc-amoy.polygon.technology'),
  BLOCKCHAIN_WS_URL: opt('BLOCKCHAIN_WS_URL', 'wss://rpc-amoy.polygon.technology'),
  CHAT_CONTRACT_ADDRESS: opt('CHAT_CONTRACT_ADDRESS', ''),
  CHAIN_ID: parseInt(opt('CHAIN_ID', '80002'), 10),
  
  // IPFS Configuration
  WEB3STORAGE_TOKEN: opt('WEB3STORAGE_TOKEN', ''),
  
  // Redis Configuration (for job queues)
  REDIS_HOST: opt('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseInt(opt('REDIS_PORT', '6379'), 10),
  REDIS_PASSWORD: opt('REDIS_PASSWORD', ''),
  REDIS_DB: parseInt(opt('REDIS_DB', '0'), 10),
  
  // MongoDB Configuration (if using MongoDB alongside Supabase)
  MONGODB_URI: opt('MONGODB_URI', ''),
  
  // Security Configuration
  SIWE_DOMAIN: opt('SIWE_DOMAIN', 'localhost'),
  SIWE_ORIGIN: opt('SIWE_ORIGIN', 'http://localhost:3000'),
  SIWE_STATEMENT: opt('SIWE_STATEMENT', 'Sign in with Ethereum to We3Chat'),
  
  // Performance Configuration
  SYNC_INTERVAL_MINUTES: parseInt(opt('SYNC_INTERVAL_MINUTES', '5'), 10),
  INDEX_INTERVAL_MINUTES: parseInt(opt('INDEX_INTERVAL_MINUTES', '10'), 10),
  MAX_MESSAGES_PER_SYNC: parseInt(opt('MAX_MESSAGES_PER_SYNC', '1000'), 10),
  
  // WebSocket Configuration
  WS_RECONNECT_INTERVAL: parseInt(opt('WS_RECONNECT_INTERVAL', '5000'), 10),
  WS_MAX_RECONNECT_ATTEMPTS: parseInt(opt('WS_MAX_RECONNECT_ATTEMPTS', '10'), 10),
  
  // Logging Configuration
  LOG_LEVEL: opt('LOG_LEVEL', 'info'),
  LOG_FORMAT: opt('LOG_FORMAT', 'json'),
  
  // Feature Flags
  ENABLE_BLOCKCHAIN_MESSAGING: opt('ENABLE_BLOCKCHAIN_MESSAGING', 'true') === 'true',
  ENABLE_IPFS_STORAGE: opt('ENABLE_IPFS_STORAGE', 'true') === 'true',
  ENABLE_REAL_TIME_SYNC: opt('ENABLE_REAL_TIME_SYNC', 'true') === 'true',
  ENABLE_MESSAGE_SEARCH: opt('ENABLE_MESSAGE_SEARCH', 'true') === 'true',
  ENABLE_KEY_ROTATION: opt('ENABLE_KEY_ROTATION', 'true') === 'true',
  ENABLE_SIWE_AUTH: opt('ENABLE_SIWE_AUTH', 'true') === 'true',
  
  // Development Configuration
  ENABLE_DEBUG_LOGS: opt('ENABLE_DEBUG_LOGS', 'false') === 'true',
  ENABLE_MOCK_DATA: opt('ENABLE_MOCK_DATA', 'false') === 'true',
  ENABLE_DEV_TOOLS: opt('ENABLE_DEV_TOOLS', 'false') === 'true',
  
  // Production Configuration
  ENABLE_COMPRESSION: opt('ENABLE_COMPRESSION', 'true') === 'true',
  ENABLE_CACHING: opt('ENABLE_CACHING', 'true') === 'true',
  CACHE_TTL_SECONDS: parseInt(opt('CACHE_TTL_SECONDS', '3600'), 10),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(opt('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(opt('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
};

// Validate required environment variables
export function validateEnv(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE',
    'SIWE_JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (ENV.SIWE_JWT_SECRET.length < 32) {
    throw new Error('SIWE_JWT_SECRET must be at least 32 characters long');
  }
  
  // Validate Supabase URL format
  if (!ENV.SUPABASE_URL.startsWith('https://') || !ENV.SUPABASE_URL.includes('.supabase.co')) {
    throw new Error('SUPABASE_URL must be a valid Supabase URL');
  }
  
  console.log('✅ Environment validation passed');
}

// Export environment info for debugging
export function getEnvInfo() {
  return {
    NODE_ENV: ENV.NODE_ENV,
    PORT: ENV.PORT,
    SUPABASE_URL: ENV.SUPABASE_URL.replace(/\/\/.*@/, '//***@'), // Hide credentials
    CHAIN_ID: ENV.CHAIN_ID,
    ENABLE_BLOCKCHAIN_MESSAGING: ENV.ENABLE_BLOCKCHAIN_MESSAGING,
    ENABLE_IPFS_STORAGE: ENV.ENABLE_IPFS_STORAGE,
    ENABLE_SIWE_AUTH: ENV.ENABLE_SIWE_AUTH,
    REDIS_HOST: ENV.REDIS_HOST,
    REDIS_PORT: ENV.REDIS_PORT
  };
}
