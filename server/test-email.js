import dotenv from 'dotenv';
import { sendPasswordResetEmail } from './utils/emailService.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Email Configuration...\n');

console.log('Environment Variables:');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'http://localhost:3000');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('');

// Test email sending
async function testEmail() {
  try {
    console.log('📧 Testing password reset email...');
    const result = await sendPasswordResetEmail(
      'test@example.com',
      'test-token-123',
      'TestUser'
    );
    
    if (result.isMock) {
      console.log('⚠️ Running in MOCK mode - no actual email sent');
      console.log('📧 Mock reset URL:', result.resetUrl);
      console.log('');
      console.log('To enable real emails:');
      console.log('1. Create .env file in server directory');
      console.log('2. Add EMAIL_USER and EMAIL_PASSWORD');
      console.log('3. For Gmail: Use App Password (not regular password)');
    } else {
      console.log('✅ Real email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
    }
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmail();
