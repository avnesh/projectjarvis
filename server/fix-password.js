// fix-password.js - Script to fix double-hashed password
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model('User', userSchema);

const fixPassword = async () => {
  try {
    await connectDB();
    
    const email = 'avipandey50@gmail.com';
    const newPassword = 'Login#1234';
    
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.username}`);
    console.log(`🔍 Current password hash: ${user.password}`);
    
    // Hash the password properly (only once)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`🔍 New password hash: ${hashedPassword}`);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Password updated successfully');
    
    // Test the password
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log(`🔍 Password test result: ${isMatch}`);
    
    if (isMatch) {
      console.log('✅ Password is working correctly');
    } else {
      console.log('❌ Password test failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
fixPassword();

