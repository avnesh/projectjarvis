// server.js - Fixed Working Version with Registration Date Support
import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables FIRST
dotenv.config();

// Environment validation and logging
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment || process.env.SHOW_ENV_STATUS === 'true') {
  console.log('🔧 Environment Variables Status:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   - PORT: ${process.env.PORT || 'not set'}`);
  console.log(`   - MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - JWT_SECRET Length: ${process.env.JWT_SECRET?.length || 0}`);
  console.log(`   - GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - TAVILY_API_KEY: ${process.env.TAVILY_API_KEY ? '✅ Set' : '❌ Missing'}`);
}

// JWT_SECRET validation
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in .env file. Please set a secure JWT_SECRET in your environment variables.');
  process.exit(1);
} else if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long for security.');
  process.exit(1);
} else if (isDevelopment) {
  console.log('✅ JWT_SECRET loaded from .env file successfully');
}

// Initialize Express app
const app = express();

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
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Input sanitization and XSS protection
app.use(sanitizeInput);
app.use(xssProtection);

// Serve static files in production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'public');
  console.log('🚀 Serving static files from:', clientBuildPath);
  app.use(express.static(clientBuildPath));
}

// MongoDB imports
import connectDB from './config/db.js';
import Chat from './models/Chat.js';
import User from './models/User.js';

// Route imports
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';

// Middleware imports
import { authenticateToken, optionalAuth, requireAdmin } from './middleware/auth.js';
import { apiLimiter, authLimiter, chatLimiter, passwordResetLimiter } from './middleware/rateLimit.js';
import { sanitizeInput, xssProtection, validateChatMessage, handleValidationErrors } from './middleware/validation.js';
import { errorHandler, asyncHandler, ErrorResponses } from './middleware/errorHandler.js';

// Connect to MongoDB
connectDB();

// ====== CONFIGURATION ======
const CONFIG = {
  models: ['groq', 'gemini', 'tavily-search'],
  maxConversationHistory: 50,
  maxRetryAttempts: 3,
  typeDelay: 20,
  loadingInterval: 300
};

// ====== QUOTA & USAGE TRACKING ======
const QUOTAS = {
  groq:   { maxTokens: 1_000_000, maxRequests: 50_000, resetHours: 24 },
  gemini: { maxTokens: null,      maxRequests: 1_500,  resetHours: 24 },
  tavily: { maxTokens: null,      maxRequests: 1_000,  resetHours: 24 },
};

const EXPOSE_DEBUG_TO_CLIENT = process.env.EXPOSE_DEBUG_TO_CLIENT === 'true';

const usageStats = {
  groq:   { tokensUsed: 0, requestsMade: 0, resetTime: getResetTime(QUOTAS.groq.resetHours) },
  gemini: { tokensUsed: 0, requestsMade: 0, resetTime: getResetTime(QUOTAS.gemini.resetHours) },
  tavily: { tokensUsed: 0, requestsMade: 0, resetTime: getResetTime(QUOTAS.tavily.resetHours) },
};

// Make global for AI routes
global.usageStats = usageStats;
global.quotaExceeded = {
  groq: false,
  gemini: false,
  tavily: false
};

// Initialize Gemini client
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  if (isDevelopment) console.log('✅ Gemini client initialized');
} else {
  console.warn('⚠️ GEMINI_API_KEY not set - Gemini will be unavailable');
}

// Global variables
global.currentModel = 'groq';
let currentModelIndex = 0;
let conversationHistory = [];
const modelTestResults = {
  groq: { working: null, lastTested: null, error: null },
  gemini: { working: null, lastTested: null, error: null },
  tavily: { working: null, lastTested: null, error: null }
};

global.modelTestResults = modelTestResults;

function getResetTime(hours) {
  return Date.now() + hours * 60 * 60 * 1000;
}

function maybeTickReset(model) {
  if (Date.now() >= usageStats[model].resetTime) {
    usageStats[model] = {
      tokensUsed: 0,
      requestsMade: 0,
      resetTime: getResetTime(QUOTAS[model].resetHours)
    };
    global.quotaExceeded[model] = false;
    console.log(`[RESET] ${model} counters reset. Next reset at ${new Date(usageStats[model].resetTime).toISOString()}`);
  }
}

function isExceeded(model) {
  const q = QUOTAS[model], s = usageStats[model];
  if (q.maxTokens != null && s.tokensUsed >= q.maxTokens) return true;
  if (q.maxRequests != null && s.requestsMade >= q.maxRequests) return true;
  return false;
}

function logBackendStatus(model) {
  const s = usageStats[model];
  const q = QUOTAS[model];
  const pctLeft = q.maxTokens ? Math.round((1 - s.tokensUsed / q.maxTokens) * 100) : 100;
  const minsLeft = Math.round((s.resetTime - Date.now()) / 60000);
  
  if (pctLeft <= 10 || minsLeft <= 5) {
    console.warn(`[QUOTA WARNING] ${model}: ${pctLeft}% tokens left, ${minsLeft}min until reset`);
  }
  
  console.log(`[QUOTA] ${model}: ${s.tokensUsed.toLocaleString()}/${q.maxTokens?.toLocaleString() || '∞'} tokens, ${s.requestsMade}/${q.maxRequests || '∞'} requests, ${minsLeft}min until reset`);
}

function updateModelTestResult(model, working, error = null) {
  modelTestResults[model] = {
    working,
    lastTested: new Date().toISOString(),
    error: error?.message || null
  };
}

function switchToNextModel() {
  const availableModels = CONFIG.models.filter(m => !global.quotaExceeded[m]);
  if (availableModels.length === 0) {
    console.error('[CRITICAL] All models exceeded quota');
    return null;
  }
  
  const currentIndex = availableModels.indexOf(global.currentModel);
  const nextIndex = (currentIndex + 1) % availableModels.length;
  const nextModel = availableModels[nextIndex];
  
  console.log(`[SWITCH] Switching from ${global.currentModel} to ${nextModel}`);
  global.currentModel = nextModel;
  return nextModel;
}

function isQuotaError(error) {
  const quotaKeywords = ['quota', 'billing', 'limit', 'exceeded', 'insufficient'];
  return quotaKeywords.some(keyword => 
    error.message.toLowerCase().includes(keyword)
  );
}

function shouldSwitchNow(model) {
  const s = usageStats[model];
  const q = QUOTAS[model];
  
  if (q.maxTokens && s.tokensUsed >= q.maxTokens * 0.9) return true;
  if (q.maxRequests && s.requestsMade >= q.maxRequests * 0.9) return true;
  
  const minsLeft = (s.resetTime - Date.now()) / 60000;
  if (minsLeft <= 5) return true;
  
  return false;
}

function getNextAvailableModelPrediction(currentModel) {
  const availableModels = CONFIG.models.filter(m => !global.quotaExceeded[m] && m !== currentModel);
  return availableModels.length > 0 ? availableModels[0] : null;
}

function predictExpiryEpochMs(model) {
  const s = usageStats[model];
  const q = QUOTAS[model];
  
  if (q.maxTokens && s.tokensUsed >= q.maxTokens * 0.9) {
    return Date.now() + 5 * 60 * 1000; // 5 minutes
  }
  if (q.maxRequests && s.requestsMade >= q.maxRequests * 0.9) {
    return Date.now() + 5 * 60 * 1000; // 5 minutes
  }
  
  return s.resetTime;
}

// ==== API call functions ====
async function callGroq(prompt, userId = null) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  try {
    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant powered by LLaMA 3.1. Provide clear, accurate, and helpful responses."
      }
    ];

    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    messages.push({
      role: "user",
      content: prompt
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from Groq API');
    }

    // Usage update
    maybeTickReset('groq');
    usageStats.groq.requestsMade += 1;
    const used = data?.usage?.total_tokens ??
      ((data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0));
    usageStats.groq.tokensUsed += Number.isFinite(used) ? used : 0;

    if (isExceeded('groq')) {
      global.quotaExceeded.groq = true;
      console.warn(`[QUOTA] groq exceeded. Will avoid until reset at ${new Date(usageStats.groq.resetTime).toISOString()}`);
    }

    logBackendStatus('groq');
    updateModelTestResult('groq', true);
    return data.choices[0].message.content;

  } catch (error) {
    updateModelTestResult('groq', false, error);
    throw error;
  }
}

async function callGemini(prompt, userId = null) {
  if (!genAI) {
    throw new Error('Gemini client not initialized - check API key');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    let contextString = "";
    if (conversationHistory.length > 0) {
      contextString = "Previous conversation context:\n";
      const recentHistory = conversationHistory.slice(-8);
      recentHistory.forEach(msg => {
        contextString += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
      });
      contextString += "\nPlease respond to the following:\n";
    }

    const fullPrompt = contextString + `Human: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    // Usage update
    maybeTickReset('gemini');
    usageStats.gemini.requestsMade += 1;
    const approxInputTokens  = Math.ceil((fullPrompt?.length || 0) / 4);
    const approxOutputTokens = Math.ceil((text?.length || 0) / 4);
    usageStats.gemini.tokensUsed += approxInputTokens + approxOutputTokens;

    if (isExceeded('gemini')) {
      global.quotaExceeded.gemini = true;
      console.warn(`[QUOTA] gemini exceeded. Will avoid until reset at ${new Date(usageStats.gemini.resetTime).toISOString()}`);
    }

    logBackendStatus('gemini');
    updateModelTestResult('gemini', true);
    return text;

  } catch (error) {
    updateModelTestResult('gemini', false, error);
    throw error;
  }
}

async function callTavilySearch(prompt, userId = null) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured');
  }

  try {
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: prompt,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Tavily API Error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    const afterSuccess = () => {
      maybeTickReset('tavily');
      usageStats.tavily.requestsMade += 1;
      if (isExceeded('tavily')) {
        global.quotaExceeded.tavily = true;
        console.warn(`[QUOTA] tavily exceeded. Will avoid until reset at ${new Date(usageStats.tavily.resetTime).toISOString()}`);
      }
      logBackendStatus('tavily');
      updateModelTestResult('tavily', true);
    };

    if (searchData.answer) {
      afterSuccess();
      return `Based on my search: ${searchData.answer}`;
    } else if (searchData.results && searchData.results.length > 0) {
      afterSuccess();
      let response = "Here's what I found:\n\n";
      searchData.results.slice(0, 3).forEach((result, index) => {
        response += `${index + 1}. ${result.title}\n${result.content}\n\n`;
      });
      return response;
    } else {
      throw new Error('No relevant search results found');
    }

  } catch (error) {
    updateModelTestResult('tavily', false, error);
    throw error;
  }
}

// NOW assign functions to global after they're defined
global.callGroq = callGroq;
global.callGemini = callGemini;
global.callTavilySearch = callTavilySearch;

// ====== MONGODB HELPER FUNCTIONS ======
async function saveMessageToMongoDB(sessionId, role, content, model = null, userId) {
  try {
    console.log(`💾 Saving message to MongoDB: ${role} - "${content.slice(0, 50)}..."`);
    
    let chat = await Chat.findOne({ sessionId, userId });
    
    if (!chat) {
      console.log(`🆕 Creating new chat session: ${sessionId}`);
      chat = new Chat({
        sessionId,
        userId,
        messages: [],
        totalMessages: 0
      });
    } else {
      console.log(`📂 Found existing chat with ${chat.messages.length} messages`);
    }

    // Add new message using the model method
    chat.addMessage(role, content, model);

    // Generate title for new conversations (only for first user message)
    if (role === 'user' && chat.messages.length === 1) {
      try {
        const title = generateChatTitle(content);
        chat.title = title;
        console.log(`📝 Generated chat title: "${title}"`);
      } catch (error) {
        console.log('⚠️ Could not generate title:', error.message);
        chat.title = 'New Conversation';
      }
    }

    await chat.save();
    console.log(`✅ Message saved! Total messages: ${chat.totalMessages}`);
    return chat;
  } catch (error) {
    console.error('❌ Error saving to MongoDB:', error);
    return null;
  }
}

// Generate session ID
function generateSessionId(userId) {
  return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate meaningful chat titles
function generateChatTitle(userMessage) {
  const content = userMessage.trim().toLowerCase();
  
  // Skip generic messages
  const genericMessages = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'test'];
  if (genericMessages.includes(content)) {
    return 'New Conversation';
  }
  
  // Extract meaningful title from user message
  let title = userMessage.trim();
  
  // Limit length and clean up
  if (title.length > 30) {
    title = title.substring(0, 30).trim();
    if (!title.endsWith('...')) {
      title += '...';
    }
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  return title || 'New Conversation';
}

async function generateConversationSummary(messages, currentModel, userId) {
  try {
    console.log(`📝 Generating summary for ${messages.length} messages using ${currentModel}`);
    
    if (messages.length < 4) {
      console.log(`⏭️ Skipping summary - only ${messages.length} messages`);
      return '';
    }

    const recentMessages = messages.slice(-10);
    console.log(`📊 Using ${recentMessages.length} recent messages for summary`);
    
    const conversationText = recentMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const summaryPrompt = `Please provide a concise summary of this conversation in 2-3 sentences. Focus on the main topics discussed and any important context that should be maintained:

${conversationText}

Summary:`;

    let summary = '';
    
    try {
      if (currentModel === 'groq' && !global.quotaExceeded.groq) {
        summary = await callGroq(summaryPrompt, userId);
      } else if (currentModel === 'gemini' && !global.quotaExceeded.gemini) {
        summary = await callGemini(summaryPrompt, userId);
      } else {
        if (!global.quotaExceeded.groq) {
          summary = await callGroq(summaryPrompt, userId);
        } else if (!global.quotaExceeded.gemini) {
          summary = await callGemini(summaryPrompt, userId);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not generate summary:', error.message);
      const topics = recentMessages
        .filter(msg => msg.role === 'user')
        .slice(-3)
        .map(msg => msg.content.slice(0, 50))
        .join(', ');
      summary = `Recent discussion topics: ${topics}`;
    }

    if (summary) {
      console.log(`✅ Summary generated: "${summary.slice(0, 100)}..."`);
    }

    return summary.slice(0, 500);
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    return '';
  }
}

async function getConversationContext(sessionId, newModel, userId) {
  try {
    console.log(`🔍 Getting context for session ${sessionId}, switching to ${newModel}`);
    
    const chat = await Chat.findOne({ sessionId, userId });
    if (!chat || chat.messages.length === 0) {
      console.log(`🔭 No previous conversation found for session ${sessionId}`);
      return '';
    }

    let context = '';
    
    // Include inherited summary from parent chat
    if (chat.inheritedSummary) {
      console.log(`📋 Found inherited summary: "${chat.inheritedSummary.slice(0, 50)}..."`);
      context += `Previous conversation context: ${chat.inheritedSummary}\n\n`;
    }
    
    if (chat.summary) {
      console.log(`📋 Found current summary: "${chat.summary.slice(0, 50)}..."`);
      context += `Current conversation summary: ${chat.summary}\n\n`;
    }

    const recentMessages = chat.messages.slice(-6);
    if (recentMessages.length > 0) {
      console.log(`💬 Including ${recentMessages.length} recent messages for context`);
      context += 'Recent conversation:\n';
      recentMessages.forEach(msg => {
        context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    console.log(`📦 Context prepared (${context.length} characters)`);
    return context;
  } catch (error) {
    console.error('❌ Error getting conversation context:', error);
    return '';
  }
}

// ==== Main AI response function ====
async function getAIResponse(prompt, sessionId = 'default-session', userId) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt provided');
  }

  let attempts = 0;
  let currentModel = CONFIG.models[currentModelIndex];
  let switchedFrom = null;

  const searchKeywords = ['search', 'latest', 'current', 'news', 'recent', 'what happened', 'find', 'weather', 'price', 'stock'];
  const needsSearch = searchKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

  if (needsSearch && !global.quotaExceeded['tavily-search']) {
    currentModel = 'tavily-search';
    currentModelIndex = CONFIG.models.indexOf('tavily-search');
    global.currentModel = currentModel;
  }

  while (attempts < CONFIG.maxRetryAttempts) {
    try {
      maybeTickReset(currentModel);
      
      if (isExceeded(currentModel)) {
        console.warn(`[QUOTA] ${currentModel} already exceeded before call. Switching...`);
        global.quotaExceeded[currentModel] = true;
        switchedFrom = currentModel;
        const next = switchToNextModel();
        if (!next) throw new Error('All AI models have quota or billing issues');
        currentModel = next;
      } else if (shouldSwitchNow(currentModel)) {
        const nextNow = getNextAvailableModelPrediction(currentModel);
        if (nextNow) {
          console.warn(`[WARNING] ${currentModel} quota low – proactively switching to ${nextNow} before expiry.`);
          switchedFrom = currentModel;
          currentModelIndex = CONFIG.models.indexOf(nextNow);
          currentModel = nextNow;
          global.currentModel = currentModel;
        }
      }

      console.log(`🤖 Attempting with model: ${currentModel} for user: ${userId}`);

      if (global.quotaExceeded[currentModel]) {
        console.log(`⚠️ [QUOTA] Model ${currentModel} flagged exceeded, switching...`);
        switchedFrom = currentModel;
        const nextModel = switchToNextModel();
        if (!nextModel) {
          console.error(`❌ [CRITICAL] All models exceeded quota for user ${userId}`);
          throw new Error('All AI models have quota or billing issues');
        }
        currentModel = nextModel;
        console.log(`✅ [SWITCH] Switched from ${switchedFrom} to ${currentModel} due to quota`);
      }

      let contextualPrompt = prompt;
      if (switchedFrom || conversationHistory.length === 0) {
        const context = await getConversationContext(sessionId, currentModel, userId);
        if (context && currentModel !== 'tavily-search') {
          contextualPrompt = `${context}\n\nCurrent user message: ${prompt}`;
        }
      }

      let response;
      switch (currentModel) {
        case 'groq':
          response = await callGroq(contextualPrompt, userId);
          break;
        case 'gemini':
          response = await callGemini(contextualPrompt, userId);
          break;
        case 'tavily-search':
          response = await callTavilySearch(prompt, userId);
          break;
        default:
          throw new Error(`Unknown model: ${currentModel}`);
      }

      // Save to MongoDB - Ensure chat exists and save messages
      let chat = await Chat.findOne({ sessionId, userId });
      if (!chat) {
        // Create new chat object in memory (don't save yet)
        chat = new Chat({
          sessionId: sessionId,
          userId: userId,
          title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
          messages: [],
          totalMessages: 0,
          isActive: true,
          isArchived: false
        });
      }
      
      // Save user message
      chat.addMessage('user', prompt, null);
      
      // Save assistant message if not search
      if (currentModel !== 'tavily-search') {
        chat.addMessage('assistant', response, currentModel);
      }
      
      // Only save to database after messages are added (prevents empty chats)
      await chat.save();
      
      // Update conversation history for non-search models
      if (currentModel !== 'tavily-search') {
        conversationHistory.push(
          { role: 'user', content: prompt, timestamp: new Date().toISOString() },
          { role: 'assistant', content: response, timestamp: new Date().toISOString() }
        );

        if (conversationHistory.length > CONFIG.maxConversationHistory) {
          conversationHistory = conversationHistory.slice(-CONFIG.maxConversationHistory);
        }

        // Update conversation summary periodically
        if (chat.messages.length % 10 === 0 && chat.messages.length > 0) {
          const summary = await generateConversationSummary(chat.messages, currentModel, userId);
          if (summary) {
            chat.createSummary(summary);
            await chat.save();
          }
        }
      }

      console.log(`✅ Success with model: ${currentModel} for user: ${userId}`);
      return {
        response,
        model: currentModel,
        switched: switchedFrom !== null,
        switchedFrom: switchedFrom,
        testResults: modelTestResults
      };

    } catch (error) {
      console.error(`❌ Error with ${currentModel}:`, error.message);
      
      if (isQuotaError(error)) {
        console.log(`🚫 Quota exceeded for ${currentModel}, marking as unavailable`);
        global.quotaExceeded[currentModel] = true;
        switchedFrom = currentModel;
        const nextModel = switchToNextModel();
        if (!nextModel) {
          throw new Error('All AI models have quota/billing issues. Please check your API keys and billing status.');
        }
        currentModel = nextModel;
      } else {
        attempts++;
        if (attempts < CONFIG.maxRetryAttempts) {
          switchedFrom = currentModel;
          const nextModel = switchToNextModel();
          if (nextModel) {
            currentModel = nextModel;
            continue;
          }
        }
        throw error;
      }
    }
  }

  // Fallback response if all AI models fail
  console.warn('⚠️ All AI models failed, sending fallback response');
  return {
    response: "I apologize, but I'm currently experiencing technical difficulties with my AI models. Please try again in a moment, or contact support if the issue persists.",
    model: 'fallback',
    switched: false,
    switchedFrom: null,
    testResults: modelTestResults
  };
}

// ====== ROUTES ======
// Apply rate limiting to routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', authenticateToken, apiLimiter, aiRoutes);
app.use('/api/chat', authenticateToken, chatLimiter, chatRoutes);

// Main chat endpoint - CLEAN VERSION
app.post('/api/chat', authenticateToken, chatLimiter, validateChatMessage, handleValidationErrors, async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    const userId = req.user._id;
    
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt is required'
      });
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || generateSessionId(userId);
    
    const result = await getAIResponse(prompt.trim(), finalSessionId, userId);

    const basePayload = { 
      success: true,
      message: result.response,
      sessionId: finalSessionId,
      model: result.model,
      modelInfo: {
        name: result.model,
        switched: result.switched || false,
        switchedFrom: result.switchedFrom || null
      }
    };

    if (EXPOSE_DEBUG_TO_CLIENT) {
      basePayload.debug = {
        testResults: result.testResults,
        quotaStatus: global.quotaExceeded,
        usageStats,
        timestamp: new Date().toISOString()
      };
    }

    res.status(200).json(basePayload);
  } catch (error) {
    console.error("💥 API error:", error.message);
    const errPayload = {
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    };
    if (EXPOSE_DEBUG_TO_CLIENT) {
      errPayload.usageStats = usageStats;
    }
    res.status(500).json(errPayload);
  }
});

// Streaming chat endpoint for real-time responses
app.post('/api/stream', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    const userId = req.user._id;
    
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Valid prompt is required'
      });
    }

    const finalSessionId = sessionId || generateSessionId(userId);
    
    console.log(`📝 Processing streaming prompt for user ${req.user.username} in session ${finalSessionId}: "${prompt.slice(0, 50)}..."`);
    
    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    try {
      // Get the AI response
      const result = await getAIResponse(prompt.trim(), finalSessionId, userId);
      
      // Send the response as streaming chunks (simulate typing effect)
      const message = result.response;
      const chunkSize = 3; // Characters per chunk
      
      for (let i = 0; i < message.length; i += chunkSize) {
        const chunk = message.slice(i, i + chunkSize);
        res.write(chunk);
        // Small delay to simulate real-time typing
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send final metadata
      res.write(`\n\n[MODEL:${result.model}]`);
      res.write(`[SESSION:${finalSessionId}]`);
      if (result.switched) {
        res.write(`[SWITCHED_FROM:${result.switchedFrom}]`);
      }
      
    } catch (error) {
      res.write(`\n\nError: ${error.message}`);
    }
    
    res.end();
    
  } catch (error) {
    console.error("💥 Streaming API error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
});

// Public routes (no authentication required)
app.get('/', async (req, res) => {
  const payload = {
    success: true,
    message: 'Multi-AI Platform - Groq + Gemini + Tavily with Registration Tracking',
    status: 'online',
    currentModel: global.currentModel,
    availableModels: CONFIG.models,
    testResults: modelTestResults,
    quotaStatus: global.quotaExceeded,
    features: [
      '🚀 Groq LLaMA 3.1 - Free unlimited reasoning',
      '🎯 Google Gemini - Free multimodal AI', 
      '🔍 Tavily Search - Real-time web search',
      '🔐 User Authentication & Chat History',
      '💾 Persistent MongoDB Storage',
      '📊 Registration Date Tracking'
    ],
    timestamp: new Date().toISOString()
  };

  if (EXPOSE_DEBUG_TO_CLIENT) {
    payload.debug = {
      usageStats: usageStats,
      quotas: QUOTAS
    };
  }

  res.status(200).json(payload);
});

// Admin monitoring endpoint - Only for you to see model status
app.get('/api/admin/monitor', authenticateToken, requireAdmin, async (req, res) => {
  try {

    const monitoringData = {
      currentModel: global.currentModel,
      availableModels: CONFIG.models,
      quotaStatus: global.quotaExceeded,
      usageStats: usageStats,
      modelTestResults: modelTestResults,
      quotas: QUOTAS,
      predictions: {},
      timestamp: new Date().toISOString()
    };

    // Add predictions for each model
    CONFIG.models.forEach(model => {
      const expiryTime = predictExpiryEpochMs(model);
      const minsLeft = expiryTime ? (expiryTime - Date.now()) / 60000 : Infinity;
      
      monitoringData.predictions[model] = {
        willExpireAt: expiryTime ? new Date(expiryTime).toISOString() : null,
        minutesLeft: minsLeft,
        nextSwitchTo: getNextAvailableModelPrediction(model),
        isHealthy: !global.quotaExceeded[model] && !isExceeded(model)
      };
    });

    res.json({
      success: true,
      monitoring: monitoringData
    });
  } catch (error) {
    console.error('❌ Error getting monitoring data:', error);
    res.status(500).json({ error: 'Failed to get monitoring data' });
  }
});

// User registration stats endpoint
app.get('/api/stats/registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {

    const stats = await User.getRegistrationStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting registration stats:', error);
    res.status(500).json({ error: 'Failed to get registration stats' });
  }
});



// Health check endpoint - Standardized
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Jarvis AI Platform is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apiKeys: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      tavily: !!process.env.TAVILY_API_KEY
    }
  });
});

// Legacy health check endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// Get chat history endpoint
app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    
    // Use the Chat model's getUserChats method which filters out empty chats
    const chats = await Chat.getUserChats(userId, Math.min(limit, 20));
    
    res.json({
      success: true,
      chats: chats.map(chat => ({
        _id: chat.sessionId,
        sessionId: chat.sessionId,
        title: chat.title || 'New Conversation',
        messages: chat.messages || [],
        totalMessages: chat.totalMessages || 0,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chat history' 
    });
  }
});

// Get specific chat endpoint
app.get('/api/chat/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findOne({ sessionId, userId, isActive: true });
    
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        error: 'Chat not found' 
      });
    }
    
    res.json({
      success: true,
      messages: chat.messages || [],
      sessionId: chat.sessionId,
      title: chat.title || 'New Chat',
      updatedAt: chat.updatedAt
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chat' 
    });
  }
});

// Create new chat endpoint
app.post('/api/chat/new', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = generateSessionId(userId);
    
    // Just return a session ID - don't create empty chat in database
    // Chat will be created when first message is sent
    console.log(`🆕 Temporary session created: ${sessionId} for user: ${req.user.username}`);
    
    res.json({
      success: true,
      sessionId,
      message: 'New chat session ready'
    });
  } catch (error) {
    console.error('Error creating new chat session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create new chat session' 
    });
  }
});

// Update chat title endpoint
app.put('/api/chat/:sessionId/title', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user._id;
    
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid title is required' 
      });
    }
    
    const chat = await Chat.findOneAndUpdate(
      { sessionId, userId, isActive: true },
      { title: title.trim() },
      { new: true }
    );
    
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        error: 'Chat not found' 
      });
    }
    
    res.json({
      success: true,
      title: chat.title,
      message: 'Chat title updated successfully'
    });
  } catch (error) {
    console.error('Error updating chat title:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update chat title' 
    });
  }
});

// Delete chat endpoint
app.delete('/api/chat/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const permanent = req.query.permanent === 'true';
    
    if (permanent) {
      await Chat.deleteOne({ sessionId, userId });
    } else {
      await Chat.updateOne({ sessionId, userId }, { isActive: false });
    }
    
    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete chat' 
    });
  }
});

// Reset conversation endpoint (now requires authentication)
app.post('/api/reset', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;
    
    if (sessionId) {
      // Reset specific chat
      await Chat.deleteOne({ sessionId, userId });
    } else {
      // Reset all user's conversations
      await Chat.updateMany({ userId, isActive: true }, { isActive: false });
    }
    
    // Clear in-memory conversation history
    conversationHistory = [];
    
    console.log(`🔄 Conversation history reset for user: ${req.user.username} ${sessionId ? `(session: ${sessionId})` : '(all chats)'}`);
    res.json({
      message: 'Conversation history reset',
      sessionId: sessionId || 'all',
      user: req.user.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error resetting conversation:', error);
    res.status(500).json({ error: 'Failed to reset conversation' });
  }
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const clientBuildPath = path.join(__dirname, 'public');
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Centralized error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Only start server if this file is run directly (not imported for testing)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`🚀 Jarvis AI Server running on http://localhost:${PORT}`);
    console.log(`🌐 Frontend URL: http://localhost:5173`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log('✅ Server ready for chat functionality');
  });
}

// Export app for testing
export default app;