#!/bin/bash

# Tarteel-Meet Desktop - Installation Script
echo "🚀 Installing Tarteel-Meet Desktop..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create assets directory if it doesn't exist
mkdir -p assets

# Copy icon if it exists in the main project
if [ -f "../public/tarteel.png" ]; then
    echo "📁 Copying logo..."
    cp "../public/tarteel.png" "assets/icon.png"
fi

echo "🎉 Installation complete!"
echo ""
echo "To start the desktop app:"
echo "  npm start"
echo ""
echo "To build for distribution:"
echo "  npm run build"
echo ""
echo "Make sure your web application is running on the configured URL!"
