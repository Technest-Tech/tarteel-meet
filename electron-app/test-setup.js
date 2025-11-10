#!/usr/bin/env node

// Test script to verify Electron app setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Almajd Meet Desktop Setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'main.js',
  'preload.js',
  'index.html',
  'config.js'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.name === 'almajd-meet-desktop') {
    console.log('✅ Package name correct');
  } else {
    console.log('❌ Package name incorrect');
    allFilesExist = false;
  }
  
  if (packageJson.main === 'main.js') {
    console.log('✅ Main entry point correct');
  } else {
    console.log('❌ Main entry point incorrect');
    allFilesExist = false;
  }
  
  if ((packageJson.dependencies && packageJson.dependencies.electron) || 
      (packageJson.devDependencies && packageJson.devDependencies.electron)) {
    console.log('✅ Electron dependency found');
  } else {
    console.log('❌ Electron dependency missing');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Check config.js
console.log('\n⚙️ Checking config.js...');
try {
  const config = require('./config.js');
  
  if (config.webAppUrl) {
    console.log(`✅ Web app URL configured: ${config.webAppUrl}`);
  } else {
    console.log('❌ Web app URL not configured');
    allFilesExist = false;
  }
  
  if (config.window && config.window.width) {
    console.log('✅ Window configuration found');
  } else {
    console.log('❌ Window configuration missing');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log('❌ Error reading config.js:', error.message);
  allFilesExist = false;
}

// Check if node_modules exists
console.log('\n📚 Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules directory exists');
  
  if (fs.existsSync('node_modules/electron')) {
    console.log('✅ Electron installed');
  } else {
    console.log('❌ Electron not installed - run: npm install');
    allFilesExist = false;
  }
} else {
  console.log('❌ node_modules not found - run: npm install');
  allFilesExist = false;
}

// Check assets
console.log('\n🎨 Checking assets...');
if (fs.existsSync('assets')) {
  console.log('✅ Assets directory exists');
} else {
  console.log('⚠️ Assets directory missing - creating...');
  fs.mkdirSync('assets');
}

// Summary
console.log('\n📊 Setup Summary:');
if (allFilesExist) {
  console.log('✅ All checks passed! Your Electron app is ready to use.');
  console.log('\n🚀 Next steps:');
  console.log('1. Update the webAppUrl in config.js to your web application URL');
  console.log('2. Run: npm start (to test the app)');
  console.log('3. Run: ./build.sh (to build for distribution)');
} else {
  console.log('❌ Some issues found. Please fix them before proceeding.');
  console.log('\n🔧 Common fixes:');
  console.log('1. Run: npm install');
  console.log('2. Check that all required files exist');
  console.log('3. Update config.js with your web application URL');
}

console.log('\n📖 For more information, see SETUP_GUIDE.md');
