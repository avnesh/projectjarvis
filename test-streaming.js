#!/usr/bin/env node

// test-streaming.js - Test streaming functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'streamtest',
  email: 'stream@test.com',
  password: 'TestPass123'
};

let authToken = null;

// Helper function to log test results
const logTest = (testName, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
  return passed;
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Register test user
const registerUser = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      authToken = data.token;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Registration failed:', error.message);
    return false;
  }
};

// Test streaming endpoint
const testStreaming = async () => {
  if (!authToken) {
    return logTest('Streaming Test', false, 'No auth token available');
  }

  try {
    const testPrompt = "Hello, please respond with a short greeting.";
    const sessionId = `test-${Date.now()}`;
    
    console.log('🔄 Testing streaming endpoint...');
    
    const response = await fetch(`${BASE_URL}/api/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        prompt: testPrompt,
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return logTest('Streaming Response Status', false, `Status: ${response.status}, Error: ${errorData.error}`);
    }

    const data = await response.json();
    
    // Check response structure
    const hasSuccess = data.hasOwnProperty('success');
    const hasMessage = data.hasOwnProperty('message');
    const hasSessionId = data.hasOwnProperty('sessionId');
    const hasModel = data.hasOwnProperty('model');
    
    if (!hasSuccess) {
      return logTest('Streaming Response Structure', false, 'Missing success field');
    }
    
    if (!data.success) {
      return logTest('Streaming Response Success', false, `Error: ${data.error}`);
    }
    
    if (!hasMessage) {
      return logTest('Streaming Response Structure', false, 'Missing message field');
    }
    
    if (!hasSessionId) {
      return logTest('Streaming Response Structure', false, 'Missing sessionId field');
    }
    
    if (!hasModel) {
      return logTest('Streaming Response Structure', false, 'Missing model field');
    }
    
    // Check message content
    if (typeof data.message !== 'string' || data.message.length === 0) {
      return logTest('Streaming Message Content', false, 'Message is empty or not a string');
    }
    
    // Check session ID
    if (data.sessionId !== sessionId) {
      return logTest('Streaming Session ID', false, `Expected: ${sessionId}, Got: ${data.sessionId}`);
    }
    
    // Check model info
    if (!data.modelInfo || typeof data.modelInfo.name !== 'string') {
      return logTest('Streaming Model Info', false, 'Missing or invalid modelInfo');
    }
    
    console.log(`   📝 Response: "${data.message.slice(0, 100)}..."`);
    console.log(`   🤖 Model: ${data.modelInfo.name}`);
    console.log(`   🆔 Session: ${data.sessionId}`);
    
    return logTest('Streaming Test', true, `Response length: ${data.message.length} chars`);
    
  } catch (error) {
    return logTest('Streaming Test', false, `Network error: ${error.message}`);
  }
};

// Test chat endpoint for comparison
const testChatEndpoint = async () => {
  if (!authToken) {
    return logTest('Chat Endpoint Test', false, 'No auth token available');
  }

  try {
    const testPrompt = "Hello, please respond with a short greeting.";
    const sessionId = `test-chat-${Date.now()}`;
    
    console.log('🔄 Testing chat endpoint...');
    
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        prompt: testPrompt,
        sessionId: sessionId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return logTest('Chat Response Status', false, `Status: ${response.status}, Error: ${errorData.error}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      return logTest('Chat Response Success', false, `Error: ${data.error}`);
    }
    
    console.log(`   📝 Response: "${data.message.slice(0, 100)}..."`);
    console.log(`   🤖 Model: ${data.modelInfo.name}`);
    
    return logTest('Chat Endpoint Test', true, `Response length: ${data.message.length} chars`);
    
  } catch (error) {
    return logTest('Chat Endpoint Test', false, `Network error: ${error.message}`);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Streaming Tests');
  console.log('============================\n');
  
  // Register user
  console.log('👤 Registering test user...');
  const registered = await registerUser();
  if (!registered) {
    console.log('❌ Failed to register test user, trying to login...');
    // Try login instead
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
      });
      
      const data = await response.json();
      if (data.success && data.token) {
        authToken = data.token;
        console.log('✅ Login successful');
      } else {
        console.log('❌ Login failed, skipping tests');
        return;
      }
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      return;
    }
  } else {
    console.log('✅ Registration successful');
  }
  
  console.log('');
  
  // Run tests
  const streamingTest = await testStreaming();
  console.log('');
  const chatTest = await testChatEndpoint();
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Streaming Test: ${streamingTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Chat Test: ${chatTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (streamingTest && chatTest) {
    console.log('\n🎉 All streaming tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the server logs for details.');
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
