// models/User.js - User schema with registration date
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username must be less than 30 characters long'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    maxlength: [128, 'Password must be less than 128 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name must be less than 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name must be less than 50 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registrationDate: {
    type: Date,
    default: Date.now,
    immutable: true // Once set, cannot be changed
  },
  registrationIP: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true }
    },
    defaultModel: {
      type: String,
      enum: ['groq', 'gemini', 'tavily'],
      default: 'groq'
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  passwordResetToken: {
    type: String,
    default: null,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false
  },
  emailVerificationToken: {
    type: String,
    default: null,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
    select: false
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username;
});

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  const now = new Date();
  const registered = this.registrationDate || this.createdAt;
  const diffTime = Math.abs(now - registered);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for formatted registration date
userSchema.virtual('registrationDateFormatted').get(function() {
  const date = this.registrationDate || this.createdAt;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set registration date
userSchema.pre('save', function(next) {
  // Set registration date if this is a new user and it's not already set
  if (this.isNew && !this.registrationDate) {
    this.registrationDate = new Date();
  }
  next();
});

// Method to check password - COMPLETE FIXED VERSION
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Starting password comparison...');
    console.log('🔍 User has password field:', !!this.password);
    console.log('🔍 Candidate password provided:', !!candidatePassword);
    
    if (!this.password) {
      console.error('❌ No password field found on user instance');
      return false;
    }
    
    if (!candidatePassword) {
      console.error('❌ No candidate password provided');
      return false;
    }
    
    // Compare passwords using bcrypt
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔍 Password comparison result:', isMatch);
    
    return isMatch;
    
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    // IMPORTANT: Return false instead of throwing error
    return false;
  }
};

// Method to update last login
userSchema.methods.updateLoginInfo = function(ipAddress = null) {
  this.lastLogin = new Date();
  this.loginCount += 1;
  if (ipAddress && !this.registrationIP) {
    this.registrationIP = ipAddress;
  }
  return this.save();
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Static method to find by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Static method to get user registration stats
userSchema.statics.getRegistrationStats = async function() {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisYear = new Date(today.getFullYear(), 0, 1);
  
  const stats = await this.aggregate([
    {
      $facet: {
        total: [{ $count: "count" }],
        thisMonth: [
          { $match: { registrationDate: { $gte: thisMonth } } },
          { $count: "count" }
        ],
        thisYear: [
          { $match: { registrationDate: { $gte: thisYear } } },
          { $count: "count" }
        ],
        byMonth: [
          {
            $group: {
              _id: { 
                year: { $year: "$registrationDate" },
                month: { $month: "$registrationDate" }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]
      }
    }
  ]);
  
  return {
    total: stats[0].total[0]?.count || 0,
    thisMonth: stats[0].thisMonth[0]?.count || 0,
    thisYear: stats[0].thisYear[0]?.count || 0,
    byMonth: stats[0].byMonth
  };
};

// Instance method to add active chat (missing method)
userSchema.methods.addActiveChat = function(chatId) {
  // This method can be used to track user's active chats
  // For now, we'll just update the lastActive timestamp
  this.lastActive = new Date();
  return this.save();
};

// Create indexes for compound queries (avoiding duplicate warnings)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ registrationDate: -1 }); // For registration analytics
userSchema.index({ lastLogin: -1 }); // For active user queries
userSchema.index({ isActive: 1, role: 1 }); // For admin queries

const User = mongoose.model('User', userSchema);

export default User;