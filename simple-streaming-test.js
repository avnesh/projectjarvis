// simple-streaming-test.js - Simple streaming test
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testHealth() {
  try {
    console.log('🔍 Testing health endpoint...');
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check response:', data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testStreaming() {
  try {
    console.log('🔍 Testing streaming endpoint...');
    
    // First register a user
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📝 Registration response:', registerData);
    
    if (!registerData.success) {
      console.log('❌ Registration failed');
      return false;
    }
    
    const token = registerData.token;
    
    // Test streaming
    const streamResponse = await fetch(`${BASE_URL}/api/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'Hello, please respond with a short greeting.',
        sessionId: 'test-session'
      })
    });
    
    const streamData = await streamResponse.json();
    console.log('📝 Streaming response:', streamData);
    
    if (streamData.success) {
      console.log('✅ Streaming test passed!');
      console.log(`   Message: "${streamData.message.slice(0, 100)}..."`);
      console.log(`   Model: ${streamData.modelInfo.name}`);
      return true;
    } else {
      console.log('❌ Streaming test failed:', streamData.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Streaming test error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting simple streaming tests...\n');
  
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('❌ Server not responding, stopping tests');
    return;
  }
  
  console.log('');
  await testStreaming();
  
  console.log('\n🏁 Tests completed');
}

main().catch(console.error);
