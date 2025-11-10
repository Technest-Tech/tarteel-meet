#!/bin/bash

# Almajd Meet Desktop - Build Script
echo "🔨 Building Almajd Meet Desktop..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Create dist directory
mkdir -p dist

# Build for current platform
echo "🏗️ Building for $(uname -s)..."

case "$(uname -s)" in
    Darwin*)
        echo "🍎 Building for macOS..."
        npm run build:mac
        ;;
    Linux*)
        echo "🐧 Building for Linux..."
        npm run build:linux
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        echo "🪟 Building for Windows..."
        npm run build:win
        ;;
    *)
        echo "❓ Unknown platform, building for current system..."
        npm run build
        ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Check the 'dist' directory for the built application"
else
    echo "❌ Build failed"
    exit 1
fi
