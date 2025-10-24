import mongoose from 'mongoose';
import * as schema from './schema';

// Explicitly set the MongoDB URL for now
const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://deekshith-gowda:KfnODZW7yPzvcnjd@cluster0.fpehzbw.mongodb.net/kroolo-dev?retryWrites=true&w=majority';

console.log('🔍 MongoDB URL:', mongoUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('✅ MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return false;
  }
}

// Test database connection
export async function testConnection() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      return await connectToDatabase();
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// No migrations needed for MongoDB (schema is flexible)
export async function runMigrations() {
  console.log('✅ MongoDB schema initialized (no migrations needed)');
  return true;
}

export { schema };
export const db = mongoose.connection;
