// models/Chat.js - Fixed Chat schema without duplicate indexes
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system'],
    index: true // Index for filtering by role
  },
  content: {
    type: String,
    required: true,
    maxlength: [50000, 'Message content too long']
  },
  model: {
    type: String,
    enum: ['groq', 'gemini', 'tavily-search', null],
    default: null
  },
  tokens: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    responseTime: { type: Number, default: null },
    tokensUsed: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    quality: { type: Number, min: 1, max: 5, default: null }
  }
}, {
  timestamps: true,
  _id: true
});

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    // Use compound index instead of simple index to avoid duplication
    // Don't use index: true here since we'll create a compound index below
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    maxlength: [200, 'Chat title too long'],
    trim: true
  },
  messages: [messageSchema],
  totalMessages: {
    type: Number,
    default: 0,
    min: 0
  },
  summary: {
    type: String,
    maxlength: [1000, 'Summary too long'],
    default: ''
  },
  inheritedSummary: {
    type: String,
    maxlength: [1000, 'Inherited summary too long'],
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag too long']
  }],
  category: {
    type: String,
    enum: ['general', 'coding', 'research', 'creative', 'support', 'other'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'en',
    maxlength: [5, 'Language code too long']
  },
  settings: {
    model: {
      type: String,
      enum: ['groq', 'gemini', 'tavily-search', 'auto'],
      default: 'auto'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      min: 1,
      max: 4096,
      default: 2048
    }
  },
  stats: {
    totalTokens: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    modelUsage: {
      groq: { type: Number, default: 0 },
      gemini: { type: Number, default: 0 },
      tavily: { type: Number, default: 0 }
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for last message
chatSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Virtual for formatted creation date
chatSchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Pre-save middleware to update totalMessages and lastActivity
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.totalMessages = this.messages.length;
    this.lastActivity = new Date();
    
    // Update stats
    this.stats.totalTokens = this.messages.reduce((total, msg) => total + (msg.tokens || 0), 0);
    
    // Update model usage stats
    this.messages.forEach(msg => {
      if (msg.model && this.stats.modelUsage[msg.model] !== undefined) {
        this.stats.modelUsage[msg.model]++;
      }
    });
  }
  next();
});

// Instance method to add a message
chatSchema.methods.addMessage = function(role, content, model = null) {
  const message = {
    role,
    content,
    model,
    tokens: Math.ceil(content.length / 4) // Rough token estimation
  };
  
  this.messages.push(message);
  this.totalMessages = this.messages.length;
  this.lastActivity = new Date();
  
  // Auto-generate title from first user message
  if (!this.title || this.title === 'New Conversation') {
    if (role === 'user' && content.length > 0) {
      this.title = content.length > 50 ? content.substring(0, 47) + '...' : content;
    }
  }
  
  return message;
};

// Instance method to create summary
chatSchema.methods.createSummary = function(summaryText) {
  this.summary = summaryText;
  return this.save();
};

// Instance method to inherit summary from parent chat
chatSchema.methods.inheritSummary = function(parentSummary) {
  this.inheritedSummary = parentSummary;
  return this.save();
};

// Instance method to add tags
chatSchema.methods.addTags = function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  newTags.forEach(tag => {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  });
  return this.save();
};

// Instance method to archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  this.isActive = false;
  return this.save();
};

// Instance method to restore chat
chatSchema.methods.restore = function() {
  this.isArchived = false;
  this.isActive = true;
  return this.save();
};

// Static method to find active chats for user
chatSchema.statics.findActiveByUser = function(userId, limit = 20) {
  return this.find({ 
    userId, 
    isActive: true, 
    isArchived: false 
  })
  .sort({ lastActivity: -1 })
  .limit(limit);
};

// Static method to search chats by content
chatSchema.statics.searchByContent = function(userId, searchTerm, limit = 10) {
  return this.find({
    userId,
    isActive: true,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { 'messages.content': { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  })
  .sort({ lastActivity: -1 })
  .limit(limit);
};

// Static method to get user chats (missing method)
chatSchema.statics.getUserChats = function(userId, limit = 20) {
  return this.find({ 
    userId, 
    isActive: true, 
    isArchived: false,
    totalMessages: { $gt: 0 } // Only return chats with at least one message
  })
  .sort({ lastActivity: -1 })
  .limit(limit);
};

// Static method to create new chat (missing method)
chatSchema.statics.createNewChat = async function(userId, options = {}) {
  const sessionId = options.sessionId || `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const chatData = {
    sessionId,
    userId,
    title: options.title || 'New Conversation',
    messages: [],
    totalMessages: 0,
    isActive: true,
    isArchived: false
  };

  // If inheriting summary from another chat
  if (options.inheritSummaryFrom) {
    const parentChat = await this.findOne({ 
      sessionId: options.inheritSummaryFrom, 
      userId 
    });
    if (parentChat && parentChat.summary) {
      chatData.inheritedSummary = parentChat.summary;
    }
  }

  const newChat = new this(chatData);
  return await newChat.save();
};

// Create indexes (compound indexes to avoid duplication warnings)
chatSchema.index({ sessionId: 1, userId: 1 }, { unique: true }); // Compound unique index
chatSchema.index({ userId: 1, lastActivity: -1 }); // For user's chat list
chatSchema.index({ userId: 1, isActive: 1, isArchived: 1 }); // For filtering active chats
chatSchema.index({ tags: 1 }); // For tag-based searches
chatSchema.index({ createdAt: -1 }); // For sorting by creation date
chatSchema.index({ 'messages.content': 'text', title: 'text' }); // Text search index

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;