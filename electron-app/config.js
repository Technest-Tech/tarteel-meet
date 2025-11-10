// Almajd Meet Desktop - Configuration
module.exports = {
  // Web application URL
  // Production domain for Almajd Meet
  webAppUrl: process.env.WEB_APP_URL || 'https://almajdmeet.org',
  
  // Development settings
  development: {
    // Enable DevTools in development
    openDevTools: false, // Disable DevTools for production use
    
    // Show loading screen duration (ms)
    loadingDuration: 1500,
  },
  
  // Window settings
  window: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Almajd Meet Desktop',
    show: false, // Don't show until ready
    titleBarStyle: 'default',
  },
  
  // Security settings
  security: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
  },
  
  // Auto-updater settings
  updater: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
  },
  
  // App metadata
  app: {
    name: 'Almajd Meet Desktop',
    version: '1.0.0',
    description: 'Desktop video conferencing application for Almajd Academy',
    author: 'Almajd Academy',
    license: 'MIT',
  },
  
  // Build settings
  build: {
    appId: 'com.almajdacademy.meet',
    productName: 'Almajd Meet',
    directories: {
      output: 'dist'
    },
    files: [
      '**/*',
      '!node_modules/**/*',
      '!dist/**/*'
    ],
    mac: {
      category: 'public.app-category.video-conferencing',
      target: 'dmg',
      icon: 'assets/icon.icns'
    },
    win: {
      target: 'nsis',
      icon: 'assets/icon.ico'
    },
    linux: {
      target: 'AppImage',
      icon: 'assets/icon.png'
    }
  }
};
