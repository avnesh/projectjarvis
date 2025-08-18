# Jarvis - Your Intelligent AI Assistant

A modern, full-stack AI chat platform with a stunning dark theme interface and seamless multi-model AI integration.

## ✨ Features

### 🎨 **Modern Dark Theme UI**
- **Stunning Visual Design**: Beautiful gradient backgrounds with glass-morphism effects
- **Smooth Animations**: Hover effects, transitions, and micro-interactions
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Wow Factor**: Eye-catching visual effects and modern typography

### 🤖 **Hidden Model System**
- **Seamless AI Experience**: Users interact with "Jarvis" without knowing which AI model is responding
- **Automatic Model Switching**: Intelligent backend handles model selection and switching
- **Admin Monitoring**: Comprehensive dashboard for backend model management
- **Quota Management**: Automatic switching when models approach limits

### 🔐 **User Authentication**
- Secure login/registration with JWT tokens
- Password reset functionality
- User-specific chat history
- Protected routes and session management

### 💬 **Advanced Chat Features**
- **Persistent Conversations**: All chats saved with full history
- **Smart Context**: AI maintains conversation context across sessions
- **Real-time Responses**: Lightning-fast AI responses
- **Message History**: Browse and continue previous conversations

### 🛠 **Technical Stack**
- **Frontend**: React + Vite with modern CSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **AI Models**: Groq, Google Gemini, Tavily Search
- **Authentication**: JWT with bcrypt

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- API Keys for AI services

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jarvis-ai
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` files in both `server/` and `client/` directories:

   **Server (.env)**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/jarvis
   JWT_SECRET=your-super-secret-jwt-key
   GROQ_API_KEY=your-groq-api-key
   GEMINI_API_KEY=your-gemini-api-key
   TAVILY_API_KEY=your-tavily-api-key
   ```

   **Client (.env)**
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Start the application**
   ```bash
   # Start backend (from server directory)
   npm start

   # Start frontend (from client directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🎯 Usage

### For Users
1. **Register/Login**: Create an account or sign in
2. **Start Chatting**: Click "New Chat" to begin a conversation
3. **Ask Anything**: Jarvis will respond intelligently to any question
4. **Browse History**: Access previous conversations from the sidebar

### For Admins
1. **Access Dashboard**: Navigate to `/admin` (requires admin role)
2. **Monitor Models**: View real-time model status and quotas
3. **Track Usage**: Monitor AI model usage and performance
4. **System Health**: Check overall system status

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Chat
- `POST /` - Send message to Jarvis
- `GET /api/chat/history` - Get user's chat history
- `GET /api/chat/:sessionId` - Get specific chat
- `POST /api/chat/new` - Create new chat
- `DELETE /api/chat/:sessionId` - Delete chat

### Admin
- `GET /api/admin/monitor` - Model monitoring dashboard
- `GET /api/stats/registrations` - User registration statistics

## 🎨 UI/UX Features

### Visual Design
- **Dark Theme**: Elegant dark interface with gradient backgrounds
- **Glass Morphism**: Modern translucent elements with backdrop blur
- **Gradient Accents**: Beautiful purple-blue gradients throughout
- **Smooth Animations**: Hover effects and transitions

### User Experience
- **Intuitive Navigation**: Clean sidebar with chat history
- **Responsive Layout**: Adapts to any screen size
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages

### Welcome Screen
- **Feature Cards**: Showcase Jarvis capabilities
- **Quick Start**: Suggestion chips for common questions
- **Animated Elements**: Floating icons and smooth transitions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **Protected Routes**: Authentication required for chat access
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full-featured experience with sidebar
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Collapsible sidebar and mobile-optimized interface

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
1. Set up MongoDB Atlas or local MongoDB
2. Configure environment variables
3. Deploy to Heroku, Vercel, or your preferred platform

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Update API URL in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies
- Powered by cutting-edge AI models
- Designed for the best user experience

---

**Built with ❤️ for seamless AI conversations**
