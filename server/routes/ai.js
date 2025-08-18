import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get AI status and model availability
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = {
      currentModel: global.currentModel || 'groq',
      availableModels: ['groq', 'gemini', 'tavily-search'],
      quotaStatus: global.quotaExceeded || {
        groq: false,
        gemini: false,
        tavily: false
      },
      testResults: global.modelTestResults || {
        groq: { working: null, lastTested: null, error: null },
        gemini: { working: null, lastTested: null, error: null },
        tavily: { working: null, lastTested: null, error: null }
      },
      usageStats: global.usageStats || {
        groq: { tokensUsed: 0, requestsMade: 0, resetTime: null },
        gemini: { tokensUsed: 0, requestsMade: 0, resetTime: null },
        tavily: { tokensUsed: 0, requestsMade: 0, resetTime: null }
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

// Get usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const usage = {
      groq: {
        tokensUsed: global.usageStats?.groq?.tokensUsed || 0,
        requestsMade: global.usageStats?.groq?.requestsMade || 0,
        resetTime: global.usageStats?.groq?.resetTime || null,
        quotaExceeded: global.quotaExceeded?.groq || false
      },
      gemini: {
        tokensUsed: global.usageStats?.gemini?.tokensUsed || 0,
        requestsMade: global.usageStats?.gemini?.requestsMade || 0,
        resetTime: global.usageStats?.gemini?.resetTime || null,
        quotaExceeded: global.quotaExceeded?.gemini || false
      },
      tavily: {
        tokensUsed: global.usageStats?.tavily?.tokensUsed || 0,
        requestsMade: global.usageStats?.tavily?.requestsMade || 0,
        resetTime: global.usageStats?.tavily?.resetTime || null,
        quotaExceeded: global.quotaExceeded?.tavily || false
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      usage
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Switch global model (for new conversations)
router.post('/switch-model', authenticateToken, async (req, res) => {
  try {
    const { targetModel } = req.body;
    
    if (!targetModel) {
      return res.status(400).json({ error: 'Target model is required' });
    }
    
    const validModels = ['groq', 'gemini', 'tavily-search'];
    if (!validModels.includes(targetModel)) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }
    
    // Check if model is available
    if (global.quotaExceeded?.[targetModel]) {
      return res.status(400).json({ 
        error: `${targetModel} is currently unavailable due to quota limits` 
      });
    }
    
    // Update global model
    global.currentModel = targetModel;
    
    console.log(`🔄 Global model switched to: ${targetModel} by user: ${req.user.username}`);
    
    res.json({
      success: true,
      message: `Global model switched to ${targetModel}`,
      currentModel: targetModel,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error switching global model:', error);
    res.status(500).json({ error: 'Failed to switch model' });
  }
});

// Test all models
router.get('/test-all-models', authenticateToken, async (req, res) => {
  try {
    const models = ['groq', 'gemini', 'tavily-search'];
    const results = {};
    
    for (const model of models) {
      const testPrompt = "Hello, please respond with just 'Working' to test this API.";
      let result = { status: 'failed', error: 'Unknown error' };
      
      try {
        let response;
        switch (model) {
          case 'groq':
            response = await global.callGroq?.(testPrompt, req.user._id);
            break;
          case 'gemini':
            response = await global.callGemini?.(testPrompt, req.user._id);
            break;
          case 'tavily-search':
            response = await global.callTavilySearch?.(testPrompt, req.user._id);
            break;
          default:
            throw new Error('Unknown model');
        }
        
        if (response) {
          result = { status: 'working', response: response.slice(0, 100) };
        }
      } catch (error) {
        result = { status: 'failed', error: error.message };
      }
      
      results[model] = result;
      
      // Update test results
      if (global.modelTestResults) {
        global.modelTestResults[model] = {
          working: result.status === 'working',
          lastTested: new Date().toISOString(),
          error: result.status === 'failed' ? result.error : null
        };
      }
    }
    
    console.log(`🧪 All models tested:`, results);
    
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing all models:', error);
    res.status(500).json({ error: 'Failed to test all models' });
  }
});

// Test specific model
router.post('/test-model', authenticateToken, async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }
    
    const validModels = ['groq', 'gemini', 'tavily-search'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }
    
    const testPrompt = "Hello, please respond with just 'Working' to test this API.";
    let result = { status: 'failed', error: 'Unknown error' };
    
    try {
      let response;
      switch (model) {
        case 'groq':
          response = await global.callGroq?.(testPrompt, req.user._id);
          break;
        case 'gemini':
          response = await global.callGemini?.(testPrompt, req.user._id);
          break;
        case 'tavily-search':
          response = await global.callTavilySearch?.(testPrompt, req.user._id);
          break;
        default:
          throw new Error('Unknown model');
      }
      
      if (response) {
        result = { status: 'working', response: response.slice(0, 100) };
      }
    } catch (error) {
      result = { status: 'failed', error: error.message };
    }
    
    // Update test results
    if (global.modelTestResults) {
      global.modelTestResults[model] = {
        working: result.status === 'working',
        lastTested: new Date().toISOString(),
        error: result.status === 'failed' ? result.error : null
      };
    }
    
    console.log(`🧪 Model test result for ${model}: ${result.status}`);
    
    res.json({
      success: true,
      model,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing model:', error);
    res.status(500).json({ error: 'Failed to test model' });
  }
});

export default router;