// config/db.js - MongoDB configuration with fallback
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set, using fallback localhost connection');
      process.env.MONGODB_URI = 'mongodb://localhost:27017/jarvis';
    }

    // Connect with error handling
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Add some basic options for better connection handling
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Don't exit the process, just log the error
    console.log('\n🔍 Connection Troubleshooting:');
    console.log('1. Check your MONGODB_URI in .env file');
    console.log('2. Make sure MongoDB is running locally or Atlas is accessible');
    console.log('3. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('4. Verify username/password are correct');
    console.log('\n⚠️ Server will continue without database connection');
    console.log('   Some features may not work properly');
  }
};

export default connectDB;