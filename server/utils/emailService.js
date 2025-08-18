// utils/emailService.js - Email service for password reset and notifications
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create transporter
const createTransporter = () => {
  // Check if email configuration is available
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email configuration not found. Email features will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate reset token
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Email service not configured - simulating email send');
      console.log(`📧 Would send reset email to: ${email}`);
      console.log(`📧 Reset token: ${resetToken}`);
      return true; // Simulate success for development
    }

    const resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Jarvis AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - Jarvis AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Jarvis AI</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello ${username},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your Jarvis AI account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
              If you're having trouble clicking the button, copy and paste this URL into your browser:
            </p>
            
            <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent from Jarvis AI. If you have any questions, please contact support.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully to: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Email service not configured - simulating welcome email');
      console.log(`📧 Would send welcome email to: ${email}`);
      return true; // Simulate success for development
    }

    const mailOptions = {
      from: `"Jarvis AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Jarvis AI! 🤖',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Jarvis AI! 🤖</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your intelligent AI assistant</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello ${username},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Welcome to Jarvis AI! We're excited to have you on board. 
              You now have access to our intelligent AI assistant that can help you with various tasks.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What you can do with Jarvis:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>💬 Have intelligent conversations</li>
                <li>🔍 Get answers to your questions</li>
                <li>📝 Get help with writing and content</li>
                <li>💻 Get coding assistance</li>
                <li>🎯 Get personalized recommendations</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/chat" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Start Chatting Now
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any questions or need help getting started, feel free to reach out to our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Thank you for choosing Jarvis AI! 🚀
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return false;
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('📧 Email service not configured - skipping test');
      return { success: false, message: 'Email service not configured' };
    }

    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, message: error.message };
  }
};
