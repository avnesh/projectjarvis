#!/usr/bin/env node

// setup.js - Project setup script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Jarvis AI - Project Setup');
console.log('============================\n');

// Generate a secure JWT secret
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Create environment files
const createEnvFiles = () => {
  console.log('📝 Creating environment files...');
  
  // Server .env
  const serverEnvPath = path.join(__dirname, 'server', '.env');
  const serverEnvContent = `# Server Environment Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/jarvis

# JWT Configuration
JWT_SECRET=${generateJWTSecret()}

# AI API Keys (Replace with your actual keys)
GROQ_API_KEY=your-groq-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
TAVILY_API_KEY=your-tavily-api-key-here

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Security
CORS_ORIGIN=http://localhost:3000
EXPOSE_DEBUG_TO_CLIENT=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

  // Client .env
  const clientEnvPath = path.join(__dirname, 'client', '.env');
  const clientEnvContent = `# Client Environment Configuration
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Jarvis AI
VITE_APP_VERSION=1.0.0
`;

  try {
    fs.writeFileSync(serverEnvPath, serverEnvContent);
    console.log('✅ Created server/.env');
    
    fs.writeFileSync(clientEnvPath, clientEnvContent);
    console.log('✅ Created client/.env');
  } catch (error) {
    console.error('❌ Error creating environment files:', error.message);
  }
};

// Check if dependencies are installed
const checkDependencies = () => {
  console.log('📦 Checking dependencies...');
  
  const serverPackagePath = path.join(__dirname, 'server', 'package.json');
  const clientPackagePath = path.join(__dirname, 'client', 'package.json');
  
  if (!fs.existsSync(serverPackagePath)) {
    console.error('❌ server/package.json not found');
    return false;
  }
  
  if (!fs.existsSync(clientPackagePath)) {
    console.error('❌ client/package.json not found');
    return false;
  }
  
  const serverNodeModules = path.join(__dirname, 'server', 'node_modules');
  const clientNodeModules = path.join(__dirname, 'client', 'node_modules');
  
  if (!fs.existsSync(serverNodeModules)) {
    console.log('⚠️ Server dependencies not installed. Run: cd server && npm install');
  } else {
    console.log('✅ Server dependencies found');
  }
  
  if (!fs.existsSync(clientNodeModules)) {
    console.log('⚠️ Client dependencies not installed. Run: cd client && npm install');
  } else {
    console.log('✅ Client dependencies found');
  }
  
  return true;
};

// Create logs directory
const createLogsDirectory = () => {
  console.log('📁 Creating logs directory...');
  
  const logsPath = path.join(__dirname, 'server', 'logs');
  
  try {
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
      console.log('✅ Created server/logs directory');
    } else {
      console.log('✅ Logs directory already exists');
    }
  } catch (error) {
    console.error('❌ Error creating logs directory:', error.message);
  }
};

// Display next steps
const displayNextSteps = () => {
  console.log('\n🎯 Next Steps:');
  console.log('==============');
  console.log('1. Install dependencies:');
  console.log('   cd server && npm install');
  console.log('   cd ../client && npm install');
  console.log('');
  console.log('2. Configure your API keys in server/.env:');
  console.log('   - Get Groq API key: https://console.groq.com/');
  console.log('   - Get Gemini API key: https://makersuite.google.com/app/apikey');
  console.log('   - Get Tavily API key: https://tavily.com/');
  console.log('');
  console.log('3. Start MongoDB (if using local):');
  console.log('   mongod');
  console.log('');
  console.log('4. Start the application:');
  console.log('   # Terminal 1 - Start server');
  console.log('   cd server && npm start');
  console.log('');
  console.log('   # Terminal 2 - Start client');
  console.log('   cd client && npm run dev');
  console.log('');
  console.log('5. Access the application:');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Backend API: http://localhost:5000');
  console.log('');
  console.log('📚 For more information, see README.md');
};

// Main setup function
const main = () => {
  try {
    createEnvFiles();
    checkDependencies();
    createLogsDirectory();
    displayNextSteps();
    
    console.log('\n🎉 Setup complete!');
    console.log('Happy coding! 🚀');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
main();
