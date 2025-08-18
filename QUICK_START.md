# 🚀 Jarvis AI - Quick Start Guide

## ⚡ **5-Minute Setup**

### **Step 1: Run Setup Script**
```bash
node setup.js
```
This will create all necessary environment files automatically.

### **Step 2: Install Dependencies**
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install
```

### **Step 3: Start the Application**
```bash
# Terminal 1 - Start server
cd server && npm start

# Terminal 2 - Start client
cd client && npm run dev
```

### **Step 4: Access the App**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🎯 **What You Get**

✅ **Working Authentication System**
- Register new users
- Login with existing accounts
- Password reset functionality
- JWT token security

✅ **AI Chat Interface**
- Beautiful dark theme UI
- Real-time chat with AI models
- Message history persistence
- File upload support

✅ **Multi-AI Model Support**
- Groq LLaMA 3.1 (fastest)
- Google Gemini (multimodal)
- Tavily Search (real-time info)
- Automatic model switching

✅ **Admin Dashboard**
- User management
- System monitoring
- Usage statistics
- Model status tracking

## 🔧 **Configuration (Optional)**

### **Add Real AI API Keys**
Edit `server/.env` and replace the placeholder values:
```env
GROQ_API_KEY=your-actual-groq-key
GEMINI_API_KEY=your-actual-gemini-key
TAVILY_API_KEY=your-actual-tavily-key
```

### **Configure Email (Optional)**
For password reset emails:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🧪 **Testing**

Run the comprehensive test suite:
```bash
node test-complete-platform.js
```

## 📱 **Features to Try**

1. **User Registration**: Create a new account
2. **Chat with AI**: Ask questions and get responses
3. **Message History**: View your conversation history
4. **File Upload**: Attach files to your messages
5. **Search**: Use Ctrl+F to search through messages
6. **Keyboard Shortcuts**: Press Ctrl+/ to see all shortcuts

## 🎨 **UI Features**

- **Dark Theme**: Beautiful gradient backgrounds
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Hover effects and transitions
- **Loading States**: Visual feedback for all operations
- **Error Handling**: User-friendly error messages

## 🔒 **Security Features**

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: XSS protection and sanitization
- **Rate Limiting**: Prevents abuse
- **CORS Protection**: Secure cross-origin requests

## 🚨 **Troubleshooting**

### **Server Won't Start**
- Check if MongoDB is running
- Verify environment variables in `server/.env`
- Check console for error messages

### **Frontend Won't Load**
- Ensure server is running on port 5000
- Check `client/.env` configuration
- Clear browser cache

### **AI Not Responding**
- Verify API keys are set correctly
- Check API key quotas and billing
- Review server logs for errors

### **Database Issues**
- Ensure MongoDB is installed and running
- Check connection string in `server/.env`
- Verify network connectivity

## 📞 **Need Help?**

1. **Check Logs**: Look at console output for error messages
2. **Run Tests**: Use `node test-complete-platform.js` to diagnose issues
3. **Verify Setup**: Ensure all dependencies are installed
4. **Check Environment**: Verify all environment variables are set

## 🎉 **You're Ready!**

The Jarvis AI platform is now fully functional and ready for development, testing, and production use. Enjoy building amazing AI-powered applications! 🚀

---

**Happy coding! 🤖✨**
