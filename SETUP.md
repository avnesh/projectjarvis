# Jarvis AI Platform Setup Guide

A comprehensive guide to set up and run the Jarvis AI platform with multi-model integration.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- API Keys for AI services

### 1. Clone and Install
```bash
git clone <repository-url>
cd jarvis-ai-platform

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Environment Setup

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jarvis
JWT_SECRET=your-super-secret-jwt-key
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
TAVILY_API_KEY=your-tavily-api-key
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Start the Application
```bash
# Terminal 1: Start Backend
cd server && npm start

# Terminal 2: Start Frontend
cd client && npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Dashboard**: http://localhost:5000/admin

## ✨ Features

### 🤖 **AI Model Integration**
- **Groq**: Lightning-fast responses
- **Google Gemini**: Advanced reasoning capabilities
- **Tavily Search**: Web search integration

### 🔐 **Authentication System**
- User registration with email verification
- Secure login with JWT tokens
- Password reset functionality
- Registration date tracking

### 💬 **Chat Features**
- Persistent conversation history
- Smart context transfer between models
- Automatic model switching
- Chat summaries and continuation

### 📊 **Admin Features**
- Real-time model monitoring
- Usage statistics and analytics
- Quota management
- System health monitoring

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Reset password

### Chat
- `POST /` - Send message to Jarvis
- `GET /api/chat/history` - Get chat history
- `GET /api/chat/:sessionId` - Get specific chat
- `POST /api/chat/new` - Create new chat

### Admin
- `GET /api/admin/monitor` - Model monitoring
- `GET /api/stats/registrations` - Registration stats

## 🎨 UI/UX Features

### Modern Design
- Dark theme with gradient backgrounds
- Glass morphism effects
- Smooth animations and transitions
- Responsive design for all devices

### User Experience
- Intuitive navigation
- Real-time chat interface
- Loading states and error handling
- Accessibility features

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting and CORS protection
- Secure API key management

## 📱 Responsive Design

The application works seamlessly on:
- **Desktop**: Full-featured experience
- **Tablet**: Optimized touch interface
- **Mobile**: Mobile-first responsive design

## 🧪 Testing

Run the comprehensive test suite:
```bash
# Test hidden model functionality
node test-hidden-models.js

# Test complete platform
node test-complete-platform.js
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas
2. Configure environment variables
3. Deploy to Heroku, Vercel, or your preferred platform

### Frontend Deployment
1. Build: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Update API URL in environment variables

## 📚 Documentation

- **API Documentation**: Check server routes for detailed endpoint information
- **Component Documentation**: React components are well-documented
- **Database Schema**: MongoDB models with validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for seamless AI conversations**
