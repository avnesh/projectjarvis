import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('🔍 Email Configuration Debug...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'http://localhost:3000');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('');

// Test transporter creation
async function testTransporter() {
  try {
    console.log('📧 Testing email transporter...');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Missing email credentials');
      return;
    }
    
    let transporter;
    
    // Check if using Brevo SMTP
    if (process.env.EMAIL_SERVICE && process.env.EMAIL_SERVICE.includes('brevo')) {
      console.log('📧 Using Brevo SMTP configuration');
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVICE || 'smtp-relay.brevo.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      // Default Gmail configuration
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
    
    console.log('✅ Transporter created successfully');
    
    // Test connection
    console.log('🔗 Testing connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully');
    
    // Test email sending
    console.log('📤 Testing email sending...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Jarvis Email Test',
      text: 'This is a test email from Jarvis to verify email configuration.',
      html: '<h1>Jarvis Email Test</h1><p>This is a test email to verify your email configuration is working.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    // Common error solutions for Brevo
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Solution: Check your Brevo SMTP credentials');
      console.log('1. Verify EMAIL_USER is correct (should be like: 94d53e001@smtp-brevo.com)');
      console.log('2. Verify EMAIL_PASSWORD is correct (should start with xsmtpsib-)');
      console.log('3. Check if your Brevo account is active');
    } else if (error.message.includes('Username and Password not accepted')) {
      console.log('\n💡 Solution: Check your Brevo credentials are correct');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n💡 Solution: Check your internet connection and Brevo SMTP settings');
    }
  }
}

testTransporter();
