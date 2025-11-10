#!/bin/bash

# Almajd Meet Desktop - Windows Build Script
# This script builds Windows executables for both 32-bit and 64-bit

echo "🚀 Almajd Meet Desktop - Windows Build"
echo "======================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if electron-builder is installed
if ! npm list electron-builder > /dev/null 2>&1; then
    echo "⚠️  electron-builder not found, installing..."
    npm install electron-builder --save-dev
    echo ""
fi

echo "🔨 Building Windows executables..."
echo "   - This will create both 32-bit and 64-bit versions"
echo "   - This may take 5-10 minutes on first build"
echo ""

# Build for Windows (both 32 and 64-bit)
npm run build:win

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Output files in dist/ directory:"
    echo "-----------------------------------"
    
    # List all exe files
    if [ -d "dist" ]; then
        ls -lh dist/*.exe 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    fi
    
    echo ""
    echo "📦 What you got:"
    echo "   • 64-bit Installer: Almajd Meet Setup 1.0.0.exe"
    echo "   • 32-bit Installer: Almajd Meet Setup 1.0.0 ia32.exe"
    echo "   • 64-bit Portable: Almajd-Meet-1.0.0-x64-portable.exe"
    echo "   • 32-bit Portable: Almajd-Meet-1.0.0-ia32-portable.exe"
    echo ""
    echo "🎉 Ready to distribute to your Windows clients!"
    echo ""
    echo "💡 Tip: Send the installer version for easier installation,"
    echo "   or portable version for no-install usage."
else
    echo ""
    echo "❌ Build failed!"
    echo "   Check the error messages above for details."
    exit 1
fi

