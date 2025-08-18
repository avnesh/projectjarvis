import api from './api';

// Rate limiting and request deduplication
let lastRequestTime = 0;
let pendingRequests = new Map();

const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

const rateLimit = () => {
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_DELAY) {
    return false;
  }
  lastRequestTime = now;
  return true;
};

const createRequestKey = (method, url, data) => {
  return `${method}:${url}:${JSON.stringify(data || {})}`;
};

const deduplicateRequest = async (key, requestFn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  const promise = requestFn();
  pendingRequests.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
};

export const getChatHistory = async (limit = 10) => {
  try {
    const response = await api.get(`/api/chat/history?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch chat history');
  }
};

export const getChat = async (sessionId) => {
  if (!rateLimit()) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }
  
  const key = createRequestKey('GET', `/api/chat/${sessionId}`);
  
  return deduplicateRequest(key, async () => {
    try {
      const response = await api.get(`/api/chat/${sessionId}`, {
        timeout: REQUEST_TIMEOUT
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Chat not found');
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch chat');
    }
  });
};

export const createNewChat = async (options = {}) => {
  try {
    const response = await api.post('/api/chat/new', options);
    return response.data;
  } catch (error) {
    console.error('Create new chat error:', error);
    throw new Error(error.response?.data?.error || 'Failed to create new chat');
  }
};

export const continueChat = async (sessionId, model = null) => {
  try {
    const response = await api.post(`/api/chat/${sessionId}/continue`, { model });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to continue chat');
  }
};

// Model switching is now handled automatically by the backend
// No user-facing model switching functionality

export const deleteChat = async (sessionId, permanent = false) => {
  try {
    const response = await api.delete(`/api/chat/${sessionId}?permanent=${permanent}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete chat');
  }
};

export const restoreChat = async (sessionId) => {
  try {
    const response = await api.post(`/api/chat/${sessionId}/restore`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to restore chat');
  }
};

export const updateChatTitle = async (sessionId, title) => {
  try {
    const response = await api.put(`/api/chat/${sessionId}/title`, { title });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update chat title');
  }
};

export const updateChatTags = async (sessionId, tags) => {
  try {
    const response = await api.put(`/api/chat/${sessionId}/tags`, { tags });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update chat tags');
  }
};

export const getChatSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/chat/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch chat summary');
  }
};

export const searchChats = async (query, limit = 10) => {
  try {
    const response = await api.get(`/api/chat/search/${encodeURIComponent(query)}?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to search chats');
  }
};

export const getArchivedChats = async (limit = 10) => {
  try {
    const response = await api.get(`/api/chat/archived/list?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch archived chats');
  }
};

export const getChats = async () => {
  if (!rateLimit()) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }
  
  const key = createRequestKey('GET', '/api/chat/history');
  
  return deduplicateRequest(key, async () => {
    try {
      const response = await api.get('/api/chat/history', {
        timeout: REQUEST_TIMEOUT
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch chats');
    }
  });
};

export const sendMessage = async (prompt, sessionId = null) => {
  if (!rateLimit()) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }
  
  const key = createRequestKey('POST', '/api/chat', { prompt, sessionId });
  
  return deduplicateRequest(key, async () => {
    try {
      const response = await api.post('/api/chat', {
        prompt: prompt.trim(),
        sessionId: sessionId || undefined
      }, {
        timeout: 60000
      });
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. The AI might be experiencing high load.');
      }
      
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  });
};

export const sendMessageStream = async (prompt, sessionId = null, onChunk, onModel, onComplete, onError) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt, sessionId })
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'status':
                if (onChunk) onChunk(data.message, false);
                break;
              case 'model':
                if (onModel) onModel(data);
                break;
              case 'chunk':
                if (onChunk) onChunk(data.content, data.isLast);
                break;
              case 'complete':
                if (onComplete) onComplete(data);
                break;
              case 'error':
                if (onError) onError(data.error);
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    if (onError) onError(error.message);
    else throw error;
  }
};

export const testAllModels = async () => {
  try {
    const response = await api.get('/api/test-all-models');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to test models');
  }
};

export const getAIStatus = async () => {
  try {
    const response = await api.get('/api/ai/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get AI status');
  }
};

export const getUsageStats = async () => {
  try {
    const response = await api.get('/api/ai/usage');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get usage stats');
  }
};

export const resetConversation = async (sessionId = null) => {
  try {
    const response = await api.post('/api/reset', { sessionId });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to reset conversation');
  }
};