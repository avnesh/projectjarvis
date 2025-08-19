#!/bin/bash
# Railway build script

echo "🚀 Starting Railway build process..."

# Install client dependencies
echo "📦 Installing client dependencies..."
npm install --prefix client

# Build client
echo "🔨 Building client..."
npm run build --prefix client

# Clean old public files completely
echo "🧹 Cleaning server public directory..."
rm -rf server/public/*

# Copy build files with verbose output
echo "📋 Copying build files to server..."
cp -rv client/dist/* server/public/

# List what was copied
echo "📂 Files in server/public:"
ls -la server/public/

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install --prefix server

echo "✅ Build completed successfully!"