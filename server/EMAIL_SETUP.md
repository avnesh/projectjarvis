# Email Setup Guide for Jarvis

## 🔧 Email Configuration

To enable password reset emails, you need to configure email settings in your environment variables.

### 1. Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Add to your `.env` file**:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
CLIENT_URL=http://localhost:3000
```

### 2. Alternative Email Services

#### SendGrid (Production Recommended)
```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```env
EMAIL_SERVICE=ses
EMAIL_USER=your-aws-access-key
EMAIL_PASSWORD=your-aws-secret-key
```

### 3. Environment Variables

Add these to your `server/.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
CLIENT_URL=http://localhost:3000

# Other required variables
MONGODB_URI=mongodb://localhost:27017/jarvis
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Testing Email Functionality

1. Start the server: `npm run dev`
2. Go to `/forgot-password` page
3. Enter your email address
4. Check your email for the reset link

### 5. Troubleshooting

#### Common Issues:

1. **"Invalid login" error**:
   - Make sure you're using an App Password, not your regular password
   - Enable 2-Factor Authentication first

2. **"Authentication failed"**:
   - Check your email and password are correct
   - Ensure you're using the right email service

3. **Emails not sending**:
   - Check server console for error messages
   - Verify your email configuration
   - Check spam folder

### 6. Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of your main password
- Consider using a dedicated email service for production
- Regularly rotate your email credentials

### 7. Production Deployment

For production, consider using:
- **SendGrid**: Reliable email delivery service
- **AWS SES**: Cost-effective for high volume
- **Mailgun**: Developer-friendly email API
- **Postmark**: Transactional email specialist
