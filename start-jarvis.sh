#!/bin/bash

echo "�� Starting Jarvis AI Platform..."

# Check if MongoDB is running
echo "📊 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   - On Windows: Start MongoDB service"
    echo "   - On Mac: brew services start mongodb-community"
    echo "   - On Linux: sudo systemctl start mongod"
    echo ""
    echo "   Or use MongoDB Atlas (cloud) and update your .env file"
    echo ""
    read -p "Press Enter to continue anyway..."
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install

# Start server in background
echo "🔧 Starting server..."
cd ../server
npm start &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Start client
echo "🌐 Starting client..."
cd ../client
npm run dev

# Cleanup on exit
trap "kill $SERVER_PID" EXIT
```

