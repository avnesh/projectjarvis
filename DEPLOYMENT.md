# Deployment Guide

## Deploy to Vercel

### Prerequisites
1. Install Vercel CLI: `npm install -g vercel`
2. Login to Vercel: `vercel login`

### Steps

#### 1. Deploy the Application
```bash
vercel --prod
```

#### 2. Set Environment Variables
Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these variables (copy from `.env.production`):

**Server Environment Variables:**
- `MONGODB_URI` - Your production MongoDB connection string
- `JWT_SECRET` - Strong secret for production (different from development)
- `OPENAI_API_KEY` - Your OpenAI API key
- `GEMINI_API_KEY` - Your Gemini API key
- `PERPLEXITY_API_KEY` - Your Perplexity API key
- `HUGGINGFACE_API_KEY` - Your HuggingFace API key
- `GROQ_API_KEY` - Your Groq API key
- `TAVILY_API_KEY` - Your Tavily API key
- `EMAIL_HOST` - smtp.gmail.com
- `EMAIL_PORT` - 587
- `EMAIL_USER` - Your Gmail address
- `EMAIL_FROM` - Your Gmail address
- `EMAIL_PASS` - Your Gmail app password
- `NODE_ENV` - production

**Client Environment Variables:**
- `VITE_API_URL` - https://your-app-name.vercel.app/api

#### 3. Update Production URLs
After deployment, update these variables with your actual Vercel URL:
- `CLIENT_URL`
- `CORS_ORIGIN` 
- `FRONTEND_URL`
- `VITE_API_URL`

### Alternative Deployment Services

#### Railway
1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically on git push

#### Render
1. Connect your GitHub repo to Render
2. Create both web service (for full-stack) or separate frontend/backend
3. Add environment variables in Render dashboard

### Important Notes
- Never commit `.env` files with real secrets
- Use different JWT secrets for development and production
- Ensure MongoDB allows connections from your hosting provider's IPs
- Test all functionality after deployment