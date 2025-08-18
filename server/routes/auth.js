// routes/auth.js - Replace user.generateAuthToken() with direct JWT generation
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendPasswordResetEmail, generateResetToken } from '../utils/emailService.js';
import { authenticateToken } from '../middleware/auth.js';
import { passwordResetLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Helper function to generate JWT token - COMPLETE FIXED VERSION
const generateAuthToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,     // Match middleware expectations
      _id: user._id,        // Keep for backward compatibility  
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }     // Match middleware expiration
  );
};

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      registrationDate: new Date(),
      ipAddress: req.clientIP || req.ip
    });

    await user.save();

    // Generate token - REPLACE user.generateAuthToken() with this:
    const token = generateAuthToken(user);
    
    // Remove password from response
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      registrationDate: user.registrationDate
    };

    console.log(`✅ New user registered: ${user.username} (${user.email})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        error: `${field} already exists` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Login route - COMPLETE FIXED VERSION
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // CRITICAL FIX: Must select +password since it's excluded by default
    const user = await User.findOne({ 
      email: email.trim().toLowerCase() 
    }).select('+password');
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    console.log(`✅ User found: ${user.username}`);
    console.log(`🔍 User has password field: ${!!user.password}`);

    // Check password using the model method
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
      console.log(`🔍 Password match result: ${isMatch}`);
    } catch (compareError) {
      console.error('❌ Password comparison failed:', compareError);
      return res.status(500).json({ 
        success: false, 
        error: 'Login verification failed. Please try again.' 
      });
    }
    
    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    console.log(`✅ Password verified for: ${user.username}`);

    // Update login info
    try {
      await user.updateLoginInfo(req.clientIP || req.ip);
    } catch (updateError) {
      console.warn('⚠️ Could not update login info:', updateError);
    }

    // Generate token that matches middleware expectations
    const token = generateAuthToken(user);
    
    console.log('🎫 Token generated successfully');
    
    // Remove password from response
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount
    };

    console.log(`✅ Login successful: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    });
  }
});


// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token is not valid' 
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Token is not valid' 
    });
  }
});

// Forgot password route
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    
    // Hash the token for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Save reset token to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();
    
    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.username);
      
      console.log(`✅ Password reset email sent successfully to: ${email}`);
      
      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email address.'
      });
      
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Clear the reset token if email failed
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      
      res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process password reset request' 
    });
  }
});

// Reset password route
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    console.log('🔍 Reset password request received');
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request body type:', typeof req.body);
    console.log('🔍 Request body keys:', Object.keys(req.body || {}));
    
    const { token, password } = req.body;
    
    console.log('🔍 Extracted token:', token ? `Present (${token.length} chars)` : 'Missing');
    console.log('🔍 Extracted password:', password ? `Present (${password.length} chars)` : 'Missing');
    console.log('🔍 Token value:', token);
    console.log('🔍 Password value:', password);
    
    if (!token || !password) {
      console.log('❌ Missing required fields - token:', !!token, 'password:', !!password);
      console.log('❌ Token truthy check:', !!token);
      console.log('❌ Password truthy check:', !!password);
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }
    
    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }
    
    // Validate new password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }
    
    // Update user password and clear reset token
    // The User model's pre-save middleware will automatically hash the password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    
    console.log(`✅ Password reset successful for user: ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
    
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get current user endpoint
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      registrationDate: req.user.registrationDate,
      lastLogin: req.user.lastLogin,
      loginCount: req.user.loginCount
    }
  });
});

// Update profile route
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username is already taken'
      });
    }

    // Update user profile
    const user = await User.findById(req.user._id);
    user.username = username.trim();
    await user.save();

    // Generate new token with updated username
    const token = generateAuthToken(user);
    
    // Remove password from response
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount
    };

    console.log(`✅ Profile updated for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Update password route
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password updated for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Password update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // by removing the token from localStorage
    console.log(`✅ User logged out: ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// Update preferences endpoint
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Preferences object is required'
      });
    }

    // Update user preferences
    const user = await User.findById(req.user._id);
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    console.log(`✅ Preferences updated for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('❌ Preferences update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// TEMPORARY DEBUG ROUTES - ADD BEFORE export default router;
router.get('/debug/clear-tokens', (req, res) => {
  res.json({
    success: true,
    message: 'Use this JavaScript in your browser console to clear tokens',
    script: `
localStorage.removeItem('token');
localStorage.removeItem('user');
sessionStorage.clear();
console.log('✅ All authentication data cleared');
window.location.reload();
    `
  });
});

router.get('/debug/jwt-info', (req, res) => {
  res.json({
    jwtSecretExists: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    environment: process.env.NODE_ENV,
    mongoConnected: true // Simplified for now
  });
});

router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email registrationDate');
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        registrationDate: user.registrationDate
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;