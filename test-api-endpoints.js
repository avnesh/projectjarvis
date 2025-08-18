// test-api-endpoints.js
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  // Test health endpoint
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log(`✅ Health check: ${healthResponse.status} ${healthResponse.statusText}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }

  // Test root endpoint
  try {
    const rootResponse = await fetch(`${API_BASE}/`);
    console.log(`✅ Root endpoint: ${rootResponse.status} ${rootResponse.statusText}`);
  } catch (error) {
    console.log(`❌ Root endpoint failed: ${error.message}`);
  }

  // Test chat history endpoint (should return 401 without auth)
  try {
    const historyResponse = await fetch(`${API_BASE}/api/chat/history`);
    console.log(`✅ Chat history endpoint: ${historyResponse.status} ${historyResponse.statusText}`);
    if (historyResponse.status === 401) {
      console.log('   Expected 401 - authentication required');
    }
  } catch (error) {
    console.log(`❌ Chat history endpoint failed: ${error.message}`);
  }

  // Test specific chat endpoint (should return 401 without auth)
  try {
    const chatResponse = await fetch(`${API_BASE}/api/chat/test-session-id`);
    console.log(`✅ Specific chat endpoint: ${chatResponse.status} ${chatResponse.statusText}`);
    if (chatResponse.status === 401) {
      console.log('   Expected 401 - authentication required');
    }
  } catch (error) {
    console.log(`❌ Specific chat endpoint failed: ${error.message}`);
  }

  console.log('\n🎯 API endpoint test completed!');
}

testEndpoints().catch(console.error);
