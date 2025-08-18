# Jarvis AI Platform - Multi-Model Intelligent Assistant

A sophisticated full-stack AI chat application featuring intelligent model switching, real-time streaming, comprehensive user management, and a stunning dark-themed interface.

## 🌟 Key Features

### 🤖 **Multi-Model AI Integration**
- **Groq (LLaMA 3.3 70B)**: High-performance reasoning and conversational AI
- **Google Gemini 1.5 Flash**: Fast, efficient responses with multimodal capabilities
- **Tavily Search API**: Real-time web search integration for current information
- **Automatic Failover**: Seamless switching between models based on availability and quotas
- **Intelligent Routing**: Context-aware model selection based on query type

### 🔐 **Advanced Authentication System**
- **JWT-based Authentication**: Secure token management with 7-day expiration
- **Password Security**: Bcrypt hashing with salt rounds
- **Email Verification**: Nodemailer integration for password resets
- **Role-based Access Control**: User and admin role separation
- **Session Management**: Persistent login with secure token storage

### 💬 **Rich Chat Features**
- **Persistent Conversations**: MongoDB storage with full message history
- **Context Preservation**: AI maintains conversation context across sessions
- **Conversation Summaries**: Automatic generation of chat summaries for long conversations
- **Chat Management**: Create, delete, and browse previous conversations
- **Real-time Streaming**: Server-sent events for streaming responses
- **Smart Title Generation**: Automatic meaningful titles for conversations

### 🎨 **Modern UI/UX Design**
- **Dark Theme Interface**: Elegant dark mode with gradient backgrounds
- **Glass Morphism Effects**: Modern translucent UI components
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Smooth Animations**: CSS transitions and hover effects
- **Loading States**: Skeleton loaders and progress indicators
- **Keyboard Shortcuts**: Efficient navigation and actions

### 🛡️ **Security & Performance**
- **Rate Limiting**: API endpoint protection against abuse
- **Input Sanitization**: XSS protection and validation middleware
- **CORS Configuration**: Secure cross-origin resource sharing
- **Helmet.js Integration**: Enhanced security headers
- **Error Handling**: Centralized error management with consistent responses
- **Logging**: Morgan and custom logger for debugging

### 📊 **Admin Features**
- **Model Monitoring Dashboard**: Real-time status of all AI models
- **Usage Statistics**: Token usage and request tracking
- **Quota Management**: Automatic quota monitoring and alerts
- **User Registration Stats**: Track user growth and activity
- **System Health Monitoring**: API health checks and uptime tracking

## 🏗️ Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js (ES6 modules)
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Bcrypt.js
- **AI Integration**: 
  - @google/generative-ai for Gemini
  - Direct API integration for Groq
  - Tavily API for web search
- **Security**: Helmet, CORS, Express-validator
- **Email**: Nodemailer for transactional emails

#### Frontend
- **Framework**: React 18.2 with Hooks
- **Build Tool**: Vite 4.4.5
- **Routing**: React Router DOM 6.8.1
- **State Management**: Context API (AuthContext, ChatContext)
- **HTTP Client**: Axios 1.6.0
- **Styling**: CSS Modules with custom animations
- **Testing**: Vitest with React Testing Library

### Project Structure

```
open_ai_codex/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Admin/         # Admin dashboard components
│   │   │   ├── Auth/          # Authentication components
│   │   │   ├── Chat/          # Chat interface components
│   │   │   ├── Common/        # Shared components
│   │   │   └── Layout/        # Layout components (Header, Sidebar)
│   │   ├── context/           # React Context providers
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layers
│   │   └── styles/            # Global styles and themes
│   ├── public/                # Static assets
│   └── vite.config.js         # Vite configuration
│
├── server/                     # Backend Node.js application
│   ├── config/                # Configuration files
│   │   └── db.js             # MongoDB connection
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Centralized error handling
│   │   ├── rateLimit.js      # API rate limiting
│   │   └── validation.js     # Input validation
│   ├── models/                # Mongoose schemas
│   │   ├── User.js           # User model with methods
│   │   └── Chat.js           # Chat/conversation model
│   ├── routes/                # API routes
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── ai.js             # AI model endpoints
│   │   └── chat.js           # Chat management (if separate)
│   ├── utils/                 # Utility functions
│   │   ├── emailService.js   # Email functionality
│   │   ├── logger.js         # Custom logging
│   │   └── validation.js     # Validation helpers
│   ├── test/                  # Test files
│   └── server.js             # Main server file
│
├── scripts/                    # Utility scripts
│   ├── test-streaming.js      # Streaming functionality test
│   ├── test-complete-platform.js # Full platform test
│   └── start-jarvis.bat/sh   # Platform startup scripts
│
└── documentation/              # Additional documentation
    ├── SETUP.md               # Detailed setup guide
    ├── QUICK_START.md         # Quick start guide
    └── PRODUCTION_READINESS_SUMMARY.md # Production checklist
```

## 🚀 Installation

### Prerequisites
- Node.js v16+ and npm
- MongoDB (local or Atlas)
- API Keys for AI services

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd open_ai_codex
```

### Step 2: Backend Setup
```bash
cd server
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jarvis
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
TAVILY_API_KEY=your-tavily-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@jarvis.ai
FRONTEND_URL=http://localhost:5173
EXPOSE_DEBUG_TO_CLIENT=false
EOF
```

### Step 3: Frontend Setup
```bash
cd ../client
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000
EOF
```

### Step 4: Start Application

#### Using startup scripts (Recommended):
```bash
# Windows
./start-jarvis.bat

# Linux/Mac
./start-jarvis.sh
```

#### Manual start:
```bash
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd client && npm run dev
```

### Step 5: Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Admin Dashboard: http://localhost:5173/admin (requires admin role)

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Password Reset Request
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Chat Endpoints

#### Send Message
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "What is quantum computing?",
  "sessionId": "optional-session-id"
}
```

#### Stream Message (Real-time)
```http
POST /api/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Explain machine learning",
  "sessionId": "optional-session-id"
}
```

#### Get Chat History
```http
GET /api/chat/history?limit=10
Authorization: Bearer <token>
```

#### Get Specific Chat
```http
GET /api/chat/:sessionId
Authorization: Bearer <token>
```

#### Create New Chat
```http
POST /api/chat/new
Authorization: Bearer <token>
```

#### Delete Chat
```http
DELETE /api/chat/:sessionId?permanent=false
Authorization: Bearer <token>
```

### Admin Endpoints

#### Model Monitoring
```http
GET /api/admin/monitor
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "currentModel": "groq",
  "quotaStatus": {
    "groq": false,
    "gemini": false,
    "tavily": false
  },
  "usageStats": {
    "groq": {
      "tokensUsed": 15000,
      "requestsMade": 250
    }
  }
}
```

#### Registration Statistics
```http
GET /api/stats/registrations
Authorization: Bearer <admin-token>
```

### System Endpoints

#### Health Check
```http
GET /health
```

#### API Status
```http
GET /
```

## 🧪 Testing

### Unit Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

### Integration Tests
```bash
# Test streaming functionality
node simple-streaming-test.js

# Test complete platform
node test-complete-platform.js

# Test API fixes
cd server && node test-api-fixes.js
```

### Manual Testing Checklist
See `MANUAL_TESTING_CHECKLIST.md` for comprehensive testing procedures.

## 🔧 Configuration

### Environment Variables

#### Server Configuration
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment mode | No | development |
| PORT | Server port | No | 5000 |
| MONGODB_URI | MongoDB connection string | Yes | - |
| JWT_SECRET | JWT signing secret (min 32 chars) | Yes | - |
| GROQ_API_KEY | Groq API key | Yes | - |
| GEMINI_API_KEY | Google Gemini API key | Yes | - |
| TAVILY_API_KEY | Tavily search API key | Yes | - |
| EMAIL_HOST | SMTP host | No | - |
| EMAIL_PORT | SMTP port | No | 587 |
| EMAIL_USER | SMTP username | No | - |
| EMAIL_PASS | SMTP password | No | - |
| EXPOSE_DEBUG_TO_CLIENT | Show debug info to client | No | false |

#### Client Configuration
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| VITE_API_URL | Backend API URL | Yes | http://localhost:5000 |

### Model Configuration

The platform automatically manages AI model quotas and switching:

```javascript
// Default quotas (server/server.js)
const QUOTAS = {
  groq:   { maxTokens: 1_000_000, maxRequests: 50_000, resetHours: 24 },
  gemini: { maxTokens: null,      maxRequests: 1_500,  resetHours: 24 },
  tavily: { maxTokens: null,      maxRequests: 1_000,  resetHours: 24 },
};
```

## 🚢 Deployment

### Production Checklist
1. ✅ Set NODE_ENV to 'production'
2. ✅ Use strong JWT_SECRET (min 32 characters)
3. ✅ Configure MongoDB Atlas or production database
4. ✅ Set up SSL/TLS certificates
5. ✅ Configure CORS for production domain
6. ✅ Enable rate limiting
7. ✅ Set up monitoring and logging
8. ✅ Configure email service for production
9. ✅ Disable debug mode (EXPOSE_DEBUG_TO_CLIENT=false)
10. ✅ Set up backup strategy

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Deployment Options
- **Heroku**: Use Procfile with `web: node server/server.js`
- **Vercel**: Deploy frontend, use Vercel functions for API
- **AWS**: EC2 with PM2 process manager
- **Google Cloud**: App Engine or Cloud Run
- **Azure**: App Service or Container Instances

## 🔒 Security Considerations

1. **Authentication**: JWT tokens expire after 7 days
2. **Password Storage**: Bcrypt with 10 salt rounds
3. **Rate Limiting**: Prevents API abuse
4. **Input Validation**: Server-side validation on all inputs
5. **XSS Protection**: Input sanitization middleware
6. **CORS**: Configured for specific origins
7. **Helmet.js**: Security headers enabled
8. **Environment Variables**: Sensitive data in .env files
9. **HTTPS**: Required for production deployment
10. **MongoDB Security**: Use connection string with authentication

## 📈 Performance Optimization

- **Database Indexing**: Indexes on frequently queried fields
- **Conversation Limits**: Maximum 50 messages in context
- **Caching**: In-memory caching for model status
- **Lazy Loading**: Components loaded on demand
- **Code Splitting**: Vite automatic code splitting
- **Compression**: Gzip compression enabled
- **CDN**: Static assets served via CDN in production

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow conventional commits
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Failed
- Ensure MongoDB is running: `mongod`
- Check connection string in .env
- Verify network connectivity

#### JWT Secret Error
- Ensure JWT_SECRET is set in .env
- Use minimum 32 characters
- Restart server after changes

#### AI Model Not Responding
- Verify API keys are correct
- Check quota limits
- Review server logs for errors

#### Frontend Not Loading
- Clear browser cache
- Check console for errors
- Verify API URL in client .env

## 📞 Support

For issues and questions:
- GitHub Issues: [Report bugs and request features]
- Documentation: Check `/documentation` folder
- Logs: Review server logs in `/server/logs`

## 🙏 Acknowledgments

- OpenAI for GPT inspiration
- Groq for LLaMA API access
- Google for Gemini API
- Tavily for search API
- MongoDB for database
- React community for frontend tools

---

**Built with ❤️ for intelligent AI conversations**

*Version 1.0.0 | Last Updated: 2025*

**🚀 Now deployed on Railway: https://projectjarvis.up.railway.app/**