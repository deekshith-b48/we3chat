import dotenv from 'dotenv';
import { runMigrations, testConnection } from '../db';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting database migration...');

  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    // Run migrations
    console.log('📦 Running migrations...');
    await runMigrations();
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
