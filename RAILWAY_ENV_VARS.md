# Railway Environment Variables

Set these environment variables in your Railway deployment:

## Required Variables

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://avipandey50:Login%231234@cluster0.uyefctz.mongodb.net/aiChatDB?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=[GENERATE A SECURE RANDOM STRING - at least 32 characters]

# Frontend URL (important for CORS)
FRONTEND_URL=https://projectjarvis.up.railway.app

# AI API Keys (REPLACE WITH REAL KEYS)
GROQ_API_KEY=[Your actual Groq API key from https://console.groq.com]
GEMINI_API_KEY=[Your actual Gemini API key from Google AI Studio]
TAVILY_API_KEY=[Your actual Tavily API key]

# Optional - Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=[Your email]
EMAIL_PASS=[Your app-specific password]
EMAIL_FROM=noreply@jarvis.ai

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=INFO
```

## How to get API Keys:

1. **GROQ_API_KEY**: 
   - Go to https://console.groq.com/keys
   - Create a new API key

2. **GEMINI_API_KEY**: 
   - Go to https://makersuite.google.com/app/apikey
   - Create a new API key

3. **TAVILY_API_KEY**: 
   - Go to https://app.tavily.com/
   - Sign up and get your API key

## Setting Variables in Railway:

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "RAW Editor" 
5. Paste all the variables above (with real values)
6. Click "Save"
7. Railway will automatically redeploy

## Important Notes:

- The mock API keys ("mock-groq-api-key", etc.) will NOT work in production
- You MUST use real API keys for the chat to work
- The JWT_SECRET should be a secure random string, not the dev one
- Make sure FRONTEND_URL matches your Railway deployment URL