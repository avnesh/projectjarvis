import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

const router = express.Router();

// Get user's chat history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    
    const chats = await Chat.getUserChats(userId, Math.min(limit, 20));
    
    console.log(`📚 Fetching ${chats.length} chats for user: ${req.user.username}`);
    
    res.json({
      chats: chats.map(chat => ({
        id: chat._id,
        sessionId: chat.sessionId,
        title: chat.title,
        summary: chat.summary?.substring(0, 200) + (chat.summary?.length > 200 ? '...' : ''),
        lastActive: chat.lastActive,
        totalMessages: chat.totalMessages,
        createdAt: chat.createdAt,
        tags: chat.tags || []
      })),
      totalChats: chats.length
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get specific chat with full message history
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    // Update user's active chats (move to top)
    await req.user.addActiveChat(chat._id);
    
    console.log(`💬 Loading chat: ${chat.title} for user: ${req.user.username}`);
    
    res.json({
      id: chat._id,
      sessionId: chat.sessionId,
      title: chat.title,
      messages: chat.messages.map(msg => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: msg.timestamp
      })),
      summary: chat.summary,
      inheritedSummary: chat.inheritedSummary,
      totalMessages: chat.totalMessages,
      lastActive: chat.lastActive,
      createdAt: chat.createdAt,
      tags: chat.tags || []
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Create new chat - Only creates a temporary session ID, actual chat is created when first message is sent
router.post('/new', async (req, res) => {
  try {
    const { inheritSummaryFrom, title, tags = [] } = req.body;
    const userId = req.user._id;
    
    // Generate a temporary session ID for the new chat
    const tempSessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🆕 Temporary session created: ${tempSessionId} for user: ${req.user.username}`);
    
    res.status(201).json({
      sessionId: tempSessionId,
      title: title?.trim() || 'New Chat',
      message: 'Temporary session created. Chat will be saved when first message is sent.'
    });
  } catch (error) {
    console.error('Error creating temporary session:', error);
    res.status(500).json({ error: 'Failed to create temporary session' });
  }
});

// Delete/Archive chat
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { permanent = false } = req.query;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    if (permanent === 'true') {
      // Permanently delete
      await Chat.findByIdAndDelete(chat._id);
      console.log(`🗑️ Chat permanently deleted: ${chat.title} by user: ${req.user.username}`);
      res.json({ message: 'Chat permanently deleted' });
    } else {
      // Soft delete (archive)
      chat.isActive = false;
      await chat.save();
      console.log(`📁 Chat archived: ${chat.title} by user: ${req.user.username}`);
      res.json({ message: 'Chat archived successfully' });
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Restore archived chat
router.post('/:sessionId/restore', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: false });
    if (!chat) {
      return res.status(404).json({ error: 'Archived chat not found' });
    }
    
    chat.isActive = true;
    chat.lastActive = new Date();
    await chat.save();
    
    // Add back to user's active chats
    await req.user.addActiveChat(chat._id);
    
    console.log(`♻️ Chat restored: ${chat.title} by user: ${req.user.username}`);
    
    res.json({ 
      message: 'Chat restored successfully',
      sessionId: chat.sessionId,
      title: chat.title
    });
  } catch (error) {
    console.error('Error restoring chat:', error);
    res.status(500).json({ error: 'Failed to restore chat' });
  }
});

// Update chat title
router.put('/:sessionId/title', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user._id;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (title.trim().length > 100) {
      return res.status(400).json({ error: 'Title must be 100 characters or less' });
    }
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    const oldTitle = chat.title;
    chat.title = title.trim();
    chat.lastActive = new Date();
    await chat.save();
    
    console.log(`✏️ Chat title updated: "${oldTitle}" → "${chat.title}" by user: ${req.user.username}`);
    
    res.json({ 
      message: 'Title updated successfully', 
      title: chat.title,
      sessionId: chat.sessionId
    });
  } catch (error) {
    console.error('Error updating title:', error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

// Update chat tags
router.put('/:sessionId/tags', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tags = [] } = req.body;
    const userId = req.user._id;
    
    if (tags.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 tags allowed' });
    }
    
    const validTags = tags.filter(tag => 
      typeof tag === 'string' && 
      tag.trim().length > 0 && 
      tag.trim().length <= 20
    ).map(tag => tag.trim().toLowerCase());
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    chat.tags = validTags;
    chat.lastActive = new Date();
    await chat.save();
    
    console.log(`🏷️ Chat tags updated: ${chat.title} → [${validTags.join(', ')}] by user: ${req.user.username}`);
    
    res.json({ 
      message: 'Tags updated successfully', 
      tags: chat.tags,
      sessionId: chat.sessionId
    });
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// Get chat summary for inheritance
router.get('/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    // If no summary exists, generate one from recent messages
    let summary = chat.summary;
    if (!summary && chat.messages.length > 0) {
      // Create a basic summary from recent messages
      const recentMessages = chat.messages.slice(-6);
      const topics = recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content.substring(0, 50))
        .join(', ');
      
      summary = `Discussion about: ${topics}`;
    }
    
    res.json({
      sessionId: chat.sessionId,
      title: chat.title,
      summary: summary || 'No summary available',
      totalMessages: chat.totalMessages,
      lastActive: chat.lastActive
    });
  } catch (error) {
    console.error('Error fetching chat summary:', error);
    res.status(500).json({ error: 'Failed to fetch chat summary' });
  }
});

// Search chats
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const searchRegex = new RegExp(query.trim(), 'i');
    
    const chats = await Chat.find({
      userId,
      isActive: true,
      $or: [
        { title: searchRegex },
        { summary: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    })
    .select('sessionId title summary lastActive totalMessages createdAt tags')
    .sort({ lastActive: -1 })
    .limit(Math.min(limit, 20));
    
    console.log(`🔍 Search "${query}" found ${chats.length} results for user: ${req.user.username}`);
    
    res.json({
      query: query.trim(),
      results: chats.map(chat => ({
        id: chat._id,
        sessionId: chat.sessionId,
        title: chat.title,
        summary: chat.summary?.substring(0, 200) + (chat.summary?.length > 200 ? '...' : ''),
        lastActive: chat.lastActive,
        totalMessages: chat.totalMessages,
        createdAt: chat.createdAt,
        tags: chat.tags || []
      })),
      totalResults: chats.length
    });
  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({ error: 'Failed to search chats' });
  }
});

// Get archived chats
router.get('/archived/list', async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    
    const archivedChats = await Chat.find({
      userId,
      isActive: false
    })
    .select('sessionId title summary lastActive totalMessages createdAt')
    .sort({ lastActive: -1 })
    .limit(Math.min(limit, 20));
    
    console.log(`🗄️ Fetching ${archivedChats.length} archived chats for user: ${req.user.username}`);
    
    res.json({
      archivedChats: archivedChats.map(chat => ({
        id: chat._id,
        sessionId: chat.sessionId,
        title: chat.title,
        summary: chat.summary?.substring(0, 200) + (chat.summary?.length > 200 ? '...' : ''),
        lastActive: chat.lastActive,
        totalMessages: chat.totalMessages,
        createdAt: chat.createdAt
      })),
      totalArchived: archivedChats.length
    });
  } catch (error) {
    console.error('Error fetching archived chats:', error);
    res.status(500).json({ error: 'Failed to fetch archived chats' });
  }
});

// Continue chat with optional model switch
router.post('/:sessionId/continue', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { model } = req.body;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    // If model is specified, switch to it
    if (model && model !== chat.settings?.model) {
      chat.settings = chat.settings || {};
      chat.settings.model = model;
      await chat.save();
      
      console.log(`🔄 Model switched to ${model} for chat: ${chat.title}`);
    }
    
    // Update last activity
    chat.lastActivity = new Date();
    await chat.save();
    
    console.log(`▶️ Continuing chat: ${chat.title} for user: ${req.user.username}`);
    
    res.json({
      id: chat._id,
      sessionId: chat.sessionId,
      title: chat.title,
      messages: chat.messages.map(msg => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: msg.timestamp
      })),
      summary: chat.summary,
      inheritedSummary: chat.inheritedSummary,
      totalMessages: chat.totalMessages,
      lastActive: chat.lastActivity,
      createdAt: chat.createdAt,
      tags: chat.tags || [],
      currentModel: chat.settings?.model || 'auto'
    });
  } catch (error) {
    console.error('Error continuing chat:', error);
    res.status(500).json({ error: 'Failed to continue chat' });
  }
});

// Switch model for a specific chat
router.post('/:sessionId/switch-model', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { targetModel } = req.body;
    const userId = req.user._id;
    
    if (!targetModel) {
      return res.status(400).json({ error: 'Target model is required' });
    }
    
    const validModels = ['groq', 'gemini', 'tavily-search', 'auto'];
    if (!validModels.includes(targetModel)) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }
    
    // Generate summary before switching if there are messages
    if (chat.messages.length > 0 && !chat.summary) {
      console.log(`📝 Generating summary before model switch for chat: ${chat.title}`);
      const recentMessages = chat.messages.slice(-6);
      const conversationText = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const summaryPrompt = `Please provide a concise summary of this conversation in 2-3 sentences. Focus on the main topics discussed and any important context that should be maintained:

${conversationText}

Summary:`;

      try {
        // Use the current model to generate summary
        const currentModel = chat.settings?.model || 'groq';
        let summary = '';
        
        if (currentModel === 'groq' && !global.quotaExceeded?.groq) {
          summary = await global.callGroq?.(summaryPrompt, userId) || '';
        } else if (currentModel === 'gemini' && !global.quotaExceeded?.gemini) {
          summary = await global.callGemini?.(summaryPrompt, userId) || '';
        } else {
          // Fallback to any available model
          if (!global.quotaExceeded?.groq) {
            summary = await global.callGroq?.(summaryPrompt, userId) || '';
          } else if (!global.quotaExceeded?.gemini) {
            summary = await global.callGemini?.(summaryPrompt, userId) || '';
          }
        }
        
        if (summary) {
          chat.summary = summary.slice(0, 500);
          console.log(`✅ Summary generated: "${summary.slice(0, 100)}..."`);
        }
      } catch (error) {
        console.log('⚠️ Could not generate summary:', error.message);
        const topics = chat.messages
          .filter(msg => msg.role === 'user')
          .slice(-3)
          .map(msg => msg.content.slice(0, 50))
          .join(', ');
        chat.summary = `Recent discussion topics: ${topics}`;
      }
    }
    
    // Update model settings
    chat.settings = chat.settings || {};
    chat.settings.model = targetModel;
    chat.lastActivity = new Date();
    await chat.save();
    
    console.log(`🔄 Model switched from ${chat.settings.model} to ${targetModel} for chat: ${chat.title}`);
    
    res.json({
      message: `Model switched to ${targetModel}`,
      sessionId: chat.sessionId,
      title: chat.title,
      currentModel: targetModel,
      summary: chat.summary,
      totalMessages: chat.totalMessages
    });
  } catch (error) {
    console.error('Error switching model:', error);
    res.status(500).json({ error: 'Failed to switch model' });
  }
});

export default router;