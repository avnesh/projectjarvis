#!/bin/bash
# Railway build script

echo "🚀 Starting Railway build process..."

# Install client dependencies
echo "📦 Installing client dependencies..."
npm install --prefix client

# Build client
echo "🔨 Building client..."
npm run build --prefix client

# Clean old assets
echo "🧹 Cleaning old assets..."
rm -rf server/public/assets

# Copy build files
echo "📋 Copying build files to server..."
cp -r client/dist/* server/public/

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install --prefix server

echo "✅ Build completed successfully!"