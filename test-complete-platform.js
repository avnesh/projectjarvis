#!/usr/bin/env node

// test-complete-platform.js - Comprehensive platform testing
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPass123'
};

let authToken = null;
let testSessionId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
const logTest = (testName, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name: testName, passed, details });
  if (passed) results.passed++;
  else results.failed++;
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { response: null, data: null, error: error.message };
  }
};

// Test 1: Server Health Check
const testServerHealth = async () => {
  console.log('\n🔍 Testing Server Health...');
  
  const { response, data } = await apiRequest('/health');
  
  if (response && response.ok && data.status === 'OK') {
    logTest('Server Health Check', true, `Status: ${data.status}`);
  } else {
    logTest('Server Health Check', false, 'Server not responding or unhealthy');
  }
};

// Test 2: API Root Endpoint
const testApiRoot = async () => {
  console.log('\n🔍 Testing API Root...');
  
  const { response, data } = await apiRequest('/');
  
  if (response && response.ok && data.message) {
    logTest('API Root Endpoint', true, `Message: ${data.message}`);
  } else {
    logTest('API Root Endpoint', false, 'API root not responding correctly');
  }
};

// Test 3: User Registration
const testUserRegistration = async () => {
  console.log('\n🔍 Testing User Registration...');
  
  const { response, data } = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(TEST_USER)
  });
  
  if (response && response.ok && data.success && data.token) {
    authToken = data.token;
    logTest('User Registration', true, `User: ${data.user.username}`);
  } else {
    logTest('User Registration', false, data?.error || 'Registration failed');
  }
};

// Test 4: User Login
const testUserLogin = async () => {
  console.log('\n🔍 Testing User Login...');
  
  const { response, data } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (response && response.ok && data.success && data.token) {
    authToken = data.token;
    logTest('User Login', true, `User: ${data.user.username}`);
  } else {
    logTest('User Login', false, data?.error || 'Login failed');
  }
};

// Test 5: Token Verification
const testTokenVerification = async () => {
  console.log('\n🔍 Testing Token Verification...');
  
  const { response, data } = await apiRequest('/api/auth/verify');
  
  if (response && response.ok && data.success && data.user) {
    logTest('Token Verification', true, `Verified user: ${data.user.username}`);
  } else {
    logTest('Token Verification', false, data?.error || 'Token verification failed');
  }
};

// Test 6: Chat History (Empty)
const testChatHistory = async () => {
  console.log('\n🔍 Testing Chat History...');
  
  const { response, data } = await apiRequest('/api/chat/history');
  
  if (response && response.ok && data.success) {
    logTest('Chat History', true, `Found ${data.chats?.length || 0} chats`);
  } else {
    logTest('Chat History', false, data?.error || 'Failed to fetch chat history');
  }
};

// Test 7: Send Chat Message
const testSendMessage = async () => {
  console.log('\n🔍 Testing Chat Message...');
  
  const testMessage = 'Hello, this is a test message!';
  
  const { response, data } = await apiRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      prompt: testMessage
    })
  });
  
  if (response && response.ok && data.success && data.message) {
    testSessionId = data.sessionId;
    logTest('Send Chat Message', true, `Response: ${data.message.substring(0, 50)}...`);
  } else {
    logTest('Send Chat Message', false, data?.error || 'Failed to send message');
  }
};

// Test 8: Get Specific Chat
const testGetChat = async () => {
  if (!testSessionId) {
    logTest('Get Specific Chat', false, 'No session ID available');
    return;
  }
  
  console.log('\n🔍 Testing Get Specific Chat...');
  
  const { response, data } = await apiRequest(`/api/chat/${testSessionId}`);
  
  if (response && response.ok && data.success && data.messages) {
    logTest('Get Specific Chat', true, `Found ${data.messages.length} messages`);
  } else {
    logTest('Get Specific Chat', false, data?.error || 'Failed to get chat');
  }
};

// Test 9: Create New Chat
const testCreateNewChat = async () => {
  console.log('\n🔍 Testing Create New Chat...');
  
  const { response, data } = await apiRequest('/api/chat/new', {
    method: 'POST'
  });
  
  if (response && response.ok && data.success && data.sessionId) {
    logTest('Create New Chat', true, `Session ID: ${data.sessionId}`);
  } else {
    logTest('Create New Chat', false, data?.error || 'Failed to create new chat');
  }
};

// Test 10: Admin Endpoints (should fail for regular user)
const testAdminEndpoints = async () => {
  console.log('\n🔍 Testing Admin Endpoints...');
  
  const { response, data } = await apiRequest('/api/admin/monitor');
  
  if (response && response.status === 403) {
    logTest('Admin Endpoint Protection', true, 'Correctly denied access to non-admin user');
  } else {
    logTest('Admin Endpoint Protection', false, 'Admin endpoint not properly protected');
  }
};

// Test 11: Invalid Endpoint
const testInvalidEndpoint = async () => {
  console.log('\n🔍 Testing Invalid Endpoint...');
  
  const { response } = await apiRequest('/api/invalid-endpoint');
  
  if (response && response.status === 404) {
    logTest('Invalid Endpoint Handling', true, 'Correctly returned 404 for invalid endpoint');
  } else {
    logTest('Invalid Endpoint Handling', false, 'Invalid endpoint not handled correctly');
  }
};

// Test 12: Rate Limiting
const testRateLimiting = async () => {
  console.log('\n🔍 Testing Rate Limiting...');
  
  // Send multiple requests quickly
  const promises = Array(5).fill().map(() => 
    apiRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Rate limit test' })
    })
  );
  
  const responses = await Promise.all(promises);
  const rateLimited = responses.some(({ response }) => 
    response && response.status === 429
  );
  
  if (rateLimited) {
    logTest('Rate Limiting', true, 'Rate limiting is working');
  } else {
    logTest('Rate Limiting', false, 'Rate limiting may not be working');
  }
};

// Test 13: Database Connection
const testDatabaseConnection = async () => {
  console.log('\n🔍 Testing Database Connection...');
  
  // Try to create a user with duplicate email
  const { response, data } = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(TEST_USER)
  });
  
  if (response && response.status === 400 && data.error && data.error.includes('already exists')) {
    logTest('Database Connection', true, 'Database is working (duplicate user correctly rejected)');
  } else {
    logTest('Database Connection', false, 'Database connection may have issues');
  }
};

// Test 14: Environment Variables
const testEnvironmentVariables = async () => {
  console.log('\n🔍 Testing Environment Variables...');
  
  const { response, data } = await apiRequest('/health');
  
  if (response && response.ok && data.environment) {
    logTest('Environment Variables', true, `Environment: ${data.environment}`);
  } else {
    logTest('Environment Variables', false, 'Environment variables not properly loaded');
  }
};

// Test 15: CORS Configuration
const testCORS = async () => {
  console.log('\n🔍 Testing CORS Configuration...');
  
  const { response } = await apiRequest('/health', {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });
  
  if (response && response.headers.get('access-control-allow-origin')) {
    logTest('CORS Configuration', true, 'CORS headers present');
  } else {
    logTest('CORS Configuration', false, 'CORS headers missing');
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Platform Tests');
  console.log('==========================================');
  console.log(`Testing server at: ${BASE_URL}`);
  console.log(`Test user: ${TEST_USER.username} (${TEST_USER.email})`);
  
  try {
    await testServerHealth();
    await testApiRoot();
    await testUserRegistration();
    await testUserLogin();
    await testTokenVerification();
    await testChatHistory();
    await testSendMessage();
    await testGetChat();
    await testCreateNewChat();
    await testAdminEndpoints();
    await testInvalidEndpoint();
    await testRateLimiting();
    await testDatabaseConnection();
    await testEnvironmentVariables();
    await testCORS();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! The platform is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the details above.');
    }
    
    // Save detailed results
    const resultsPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running!');
    console.log('Please start the server first:');
    console.log('cd server && npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running, starting tests...\n');
  await runAllTests();
};

// Run tests
main().catch(console.error);
