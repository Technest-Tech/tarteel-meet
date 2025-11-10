const { app, BrowserWindow, ipcMain, dialog, systemPreferences, Menu, desktopCapturer } = require('electron');
const path = require('path');

// Make electron-updater optional for builds
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
  console.log('⚠️ electron-updater not available (normal for builds)');
}

const config = require('./config');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  console.log('🚀 Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    ...config.window,
    webPreferences: {
      ...config.security,
      preload: path.join(__dirname, 'preload.js'),
      // Additional settings for media access
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Enable iframe media access
      webSecurity: false,
      // Allow iframe to access parent window
      nodeIntegrationInSubFrames: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });
  
  console.log('✅ Main window created');

  // Create application menu with debugging options
  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
              mainWindow.webContents.closeDevTools();
            } else {
              mainWindow.webContents.openDevTools();
            }
          }
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Back to Room Entry',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.loadFile('index.html');
          }
        }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Console Logs',
          click: () => {
            console.log('🔍 Current permission status:');
            console.log('📷 Camera:', systemPreferences.getMediaAccessStatus('camera'));
            console.log('🎤 Microphone:', systemPreferences.getMediaAccessStatus('microphone'));
          }
        },
        {
          label: 'Request Media Permissions',
          click: async () => {
            try {
              await systemPreferences.askForMediaAccess('camera');
              await systemPreferences.askForMediaAccess('microphone');
              console.log('✅ Media permissions requested');
            } catch (error) {
              console.error('❌ Error requesting permissions:', error);
            }
          }
        },
        {
          label: 'Test Screen Capture',
          click: async () => {
            try {
              console.log('🧪 Testing screen capture...');
              const sources = await desktopCapturer.getSources({
                types: ['screen', 'window'],
                thumbnailSize: { width: 150, height: 150 }
              });
              console.log('📺 Available sources:', sources.length);
              sources.forEach((source, index) => {
                console.log(`  ${index + 1}. ${source.name} (${source.id})`);
              });
            } catch (error) {
              console.error('❌ Screen capture test failed:', error);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Set additional web security settings for iframe media access
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Permissions-Policy': [
        'camera=*, microphone=*, autoplay=*, encrypted-media=*, fullscreen=*, display-capture=*, screen-wake-lock=*'
      ],
      'Feature-Policy': [
        'camera *; microphone *; autoplay *; encrypted-media *; fullscreen *; display-capture *; screen-wake-lock *'
      ]
    };
    
    callback({ responseHeaders });
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Inject configuration into the renderer process
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      window.APP_CONFIG = {
        webAppUrl: '${config.webAppUrl}'
      };
      console.log('✅ App config injected:', window.APP_CONFIG);
    `);
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools for debugging
    if (config.development.openDevTools) {
      mainWindow.webContents.openDevTools();
      console.log('🔧 DevTools opened for debugging');
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation events
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('🧭 Navigation to:', navigationUrl);
    
    // Allow navigation to the web app (both production and localhost for development)
    if (navigationUrl.includes('almajdmeet.org') || navigationUrl.includes('localhost:3000')) {
      console.log('✅ Allowing navigation to web app');
      return;
    }
    
    // Block other external navigation
    console.log('❌ Blocking external navigation to:', navigationUrl);
    event.preventDefault();
  });

  // Handle page title updates
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    console.log('📄 Page title updated:', title);
    mainWindow.setTitle(`Almajd Meet - ${title}`);
  });

  // Inject screen capture polyfill and meeting end handler when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('📄 Page finished loading, injecting polyfills...');
    
    const currentUrl = mainWindow.webContents.getURL();
    
    // Inject meeting end handler for conference pages
    if (currentUrl.includes('/h') || currentUrl.includes('/rooms/')) {
      console.log('🔧 Injecting meeting end handler...');
      
      // Extract room ID from URL
      const urlMatch = currentUrl.match(/\/(\d+)\/h/);
      const roomId = urlMatch ? urlMatch[1] : '';
      
      mainWindow.webContents.executeJavaScript(`
        (function() {
          'use strict';
          
          console.log('🔧 Meeting end handler loaded');
          const roomId = '${roomId}';
          
          // Monitor for meeting end or leave events
          function setupMeetingEndHandler() {
            // Listen for page unload (user navigating away)
            let isLeavingMeeting = false;
            
            // Monitor URL changes
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            function checkForLeave(url) {
              if (url && (url === '/' || url.includes('/admin') || url === window.location.origin)) {
                console.log('👋 User left the meeting, returning to entry...');
                isLeavingMeeting = true;
                if (window.electronAPI && window.electronAPI.backToEntry) {
                  window.electronAPI.backToEntry(roomId);
                }
              }
            }
            
            history.pushState = function() {
              originalPushState.apply(history, arguments);
              checkForLeave(arguments[2]);
            };
            
            history.replaceState = function() {
              originalReplaceState.apply(history, arguments);
              checkForLeave(arguments[2]);
            };
            
            // Listen for popstate (back button)
            window.addEventListener('popstate', function(e) {
              checkForLeave(window.location.href);
            });
            
            // Listen for beforeunload
            window.addEventListener('beforeunload', function(e) {
              if (!isLeavingMeeting && window.location.pathname === '/') {
                isLeavingMeeting = true;
                if (window.electronAPI && window.electronAPI.backToEntry) {
                  window.electronAPI.backToEntry(roomId);
                }
              }
            });
            
            // Monitor for "Leave Meeting" or "End Meeting" button clicks
            document.addEventListener('click', function(e) {
              const target = e.target;
              if (target && (
                target.textContent?.toLowerCase().includes('leave') ||
                target.textContent?.toLowerCase().includes('end meeting') ||
                target.getAttribute('aria-label')?.toLowerCase().includes('leave') ||
                target.getAttribute('aria-label')?.toLowerCase().includes('disconnect')
              )) {
                console.log('👋 Meeting end/leave detected');
                setTimeout(() => {
                  if (window.electronAPI && window.electronAPI.backToEntry) {
                    window.electronAPI.backToEntry(roomId);
                  }
                }, 1000);
              }
            }, true);
            
            console.log('✅ Meeting end handler setup complete');
          }
          
          // Wait for DOM to be ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupMeetingEndHandler);
          } else {
            setupMeetingEndHandler();
          }
        })();
      `).catch(error => {
        console.error('❌ Error injecting meeting end handler:', error);
      });
    }
    
    // Inject the screen capture polyfill directly
    mainWindow.webContents.executeJavaScript(`
      (function() {
        'use strict';
        
        console.log('🔧 Loading screen capture polyfill...');
        
        // Check if we're in Electron
        if (!window.electronAPI) {
          console.log('⚠️ Not in Electron environment, skipping polyfill');
          return;
        }
        
        // Override navigator.mediaDevices.getDisplayMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
          
          navigator.mediaDevices.getDisplayMedia = async function(constraints = {}) {
            console.log('🖥️ getDisplayMedia called with constraints:', constraints);
            
            try {
              // Check if screen capture is supported
              const supportCheck = await window.electronAPI.checkScreenCaptureSupport();
              console.log('📺 Screen capture support:', supportCheck);
              
              if (!supportCheck.supported) {
                throw new DOMException('Screen capture not supported', 'NotSupportedError');
              }
              
              // Get display media from Electron
              const result = await window.electronAPI.getDisplayMedia();
              console.log('✅ Display media result:', result);
              
              if (!result.success) {
                throw new DOMException(result.error || 'Failed to get display media', 'NotSupportedError');
              }
              
              // Create a proper MediaStream using Electron's screen capture
              return new Promise(async (resolve, reject) => {
                try {
                  console.log('🎬 Creating screen capture stream...');
                  
                  // Get the screen source from Electron
                  const sources = await window.electronAPI.getDisplayMedia();
                  if (!sources.success) {
                    throw new Error('Failed to get screen source');
                  }
                  
                  // Create a video element to display the screen capture
                  const video = document.createElement('video');
                  video.style.display = 'none';
                  video.autoplay = true;
                  video.muted = true;
                  document.body.appendChild(video);
                  
                  // Use Electron's screen capture API
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                      mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sources.source.id,
                        minWidth: 1280,
                        maxWidth: 1920,
                        minHeight: 720,
                        maxHeight: 1080
                      }
                    }
                  });
                  
                  console.log('✅ Screen capture stream created with', stream.getVideoTracks().length, 'video tracks');
                  resolve(stream);
                  
                } catch (error) {
                  console.error('❌ Error creating screen capture stream:', error);
                  
                  // Fallback: create a basic video track
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1280;
                    canvas.height = 720;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw a placeholder
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px Arial';
                    ctx.fillText('Screen Capture', 50, 50);
                    
                    const fallbackStream = canvas.captureStream(30);
                    console.log('⚠️ Using fallback canvas stream');
                    resolve(fallbackStream);
                  } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError);
                    reject(error);
                  }
                }
              });
              
            } catch (error) {
              console.error('❌ Screen capture polyfill error:', error);
              throw error;
            }
          };
          
          console.log('✅ Screen capture polyfill loaded successfully');
        } else {
          console.log('⚠️ navigator.mediaDevices.getDisplayMedia not available');
        }
      })();
    `).catch(error => {
      console.error('❌ Error injecting polyfill:', error);
    });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Add keyboard shortcuts for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 to toggle DevTools
    if (input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
    
    // Cmd/Ctrl + Shift + I to toggle DevTools
    if ((input.meta || input.control) && input.shift && input.key === 'I') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Handle media permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔔 Permission requested:', permission);
    
    if (permission === 'media' || permission === 'camera' || permission === 'microphone' || permission === 'display-capture') {
      console.log('✅ Granting media permission request for:', permission);
      callback(true);
    } else if (permission === 'notifications' || permission === 'geolocation') {
      console.log('❌ Denying permission:', permission);
      callback(false);
    } else {
      console.log('✅ Default permission grant for:', permission);
      callback(true);
    }
  });

  // Handle media access
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log('Permission check:', permission, 'from:', requestingOrigin, 'details:', details);
    
    if (permission === 'media' || permission === 'camera' || permission === 'microphone' || permission === 'display-capture') {
      console.log('✅ Granting media permission for:', permission);
      return true;
    }
    
    // Allow other common permissions
    if (permission === 'notifications' || permission === 'geolocation') {
      console.log('❌ Denying permission:', permission);
      return false;
    }
    
    // Default to true for other permissions
    console.log('✅ Default permission grant for:', permission);
    return true;
  });
}

// Set command line switches for media access
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('disable-site-isolation-trials');
// Screen sharing permissions
app.commandLine.appendSwitch('enable-screen-capture');
app.commandLine.appendSwitch('enable-usermedia-screen-capture');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
// Additional screen sharing switches
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays');
app.commandLine.appendSwitch('enable-oop-rasterization');
// Screen capture specific switches
app.commandLine.appendSwitch('enable-features', 'ScreenCapture');
app.commandLine.appendSwitch('enable-features', 'DesktopCapture');
app.commandLine.appendSwitch('enable-features', 'WebRTC');
app.commandLine.appendSwitch('enable-features', 'MediaStreamTrack');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('🎯 Electron app ready, creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Auto-updater events (only if available)
if (autoUpdater) {
  autoUpdater.checkForUpdatesAndNotify();
} else {
  console.log('ℹ️ Auto-updater disabled (electron-updater not available)');
}

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-error-dialog', async (event, title, content) => {
  const result = await dialog.showErrorBox(title, content);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Media permission handlers
ipcMain.handle('request-media-permissions', async () => {
  try {
    console.log('🎥 Requesting media permissions...');
    
    // On macOS, request permissions explicitly
    if (process.platform === 'darwin') {
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
      const microphoneStatus = systemPreferences.getMediaAccessStatus('microphone');
      
      console.log('📷 Camera status:', cameraStatus);
      console.log('🎤 Microphone status:', microphoneStatus);
      
      if (cameraStatus === 'not-determined') {
        console.log('📷 Requesting camera access...');
        await systemPreferences.askForMediaAccess('camera');
      }
      if (microphoneStatus === 'not-determined') {
        console.log('🎤 Requesting microphone access...');
        await systemPreferences.askForMediaAccess('microphone');
      }
    }
    
    console.log('✅ Media permissions granted');
    return { success: true };
  } catch (error) {
    console.error('❌ Error requesting media permissions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-media-permissions', async () => {
  try {
    console.log('🔍 Checking media permissions...');
    
    if (process.platform === 'darwin') {
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
      const microphoneStatus = systemPreferences.getMediaAccessStatus('microphone');
      
      console.log('📷 Camera status:', cameraStatus);
      console.log('🎤 Microphone status:', microphoneStatus);
      
      const hasAccess = cameraStatus === 'granted' && microphoneStatus === 'granted';
      console.log('✅ Has media access:', hasAccess);
      
      return {
        camera: cameraStatus,
        microphone: microphoneStatus,
        hasAccess: hasAccess
      };
    }
    
    console.log('✅ Assuming media access on non-macOS platform');
    return { hasAccess: true }; // Assume access on other platforms
  } catch (error) {
    console.error('❌ Error checking media permissions:', error);
    return { hasAccess: false, error: error.message };
  }
});

// Navigation handler
ipcMain.handle('navigate-to-conference', async (event, url) => {
  try {
    console.log('🌐 Navigating to conference:', url);
    
    // Load the conference URL directly in the main window
    mainWindow.loadURL(url);
    
    console.log('✅ Navigation completed');
    return { success: true };
  } catch (error) {
    console.error('❌ Error navigating to conference:', error);
    return { success: false, error: error.message };
  }
});

// Handle navigation back to entry screen
ipcMain.handle('back-to-entry', async (event, roomId) => {
  try {
    console.log('🔙 Returning to entry screen with room ID:', roomId);
    
    // Load the entry screen
    await mainWindow.loadFile('index.html');
    
    // Wait for the page to load and inject the room ID
    mainWindow.webContents.once('dom-ready', () => {
      if (roomId) {
        mainWindow.webContents.executeJavaScript(`
          // Wait for the app to initialize
          setTimeout(() => {
            const roomInput = document.getElementById('room-name');
            if (roomInput) {
              roomInput.value = '${roomId}';
              console.log('✅ Room ID restored:', '${roomId}');
            }
          }, 500);
        `);
      }
    });
    
    console.log('✅ Returned to entry screen');
    return { success: true };
  } catch (error) {
    console.error('❌ Error returning to entry screen:', error);
    return { success: false, error: error.message };
  }
});

// Screen sharing handlers
ipcMain.handle('get-display-media', async () => {
  try {
    console.log('🖥️ Requesting screen capture...');
    
    // Use Electron's desktopCapturer API
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 }
    });
    
    console.log('📺 Available screens:', sources.length);
    
    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }
    
    // Automatically select the first screen (primary screen)
    const selectedSource = sources[0];
    console.log('✅ Auto-selected screen:', selectedSource.name, 'ID:', selectedSource.id);
    
    return {
      success: true,
      source: {
        id: selectedSource.id,
        name: selectedSource.name,
        thumbnail: selectedSource.thumbnail.toDataURL()
      }
    };
  } catch (error) {
    console.error('❌ Error getting display media:', error);
    return { success: false, error: error.message };
  }
});

// Screen selection dialog removed - now auto-selects primary screen

ipcMain.handle('check-screen-capture-support', async () => {
  try {
    console.log('🔍 Checking screen capture support...');
    
    // Use the desktopCapturer API directly
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 1, height: 1 }
    });
    
    const isSupported = sources.length > 0;
    console.log('✅ Screen capture supported:', isSupported, 'sources:', sources.length);
    
    return { 
      supported: isSupported, 
      sourceCount: sources.length,
      sources: sources.map(s => ({ id: s.id, name: s.name }))
    };
  } catch (error) {
    console.error('❌ Error checking screen capture support:', error);
    return { supported: false, error: error.message };
  }
});

// Screen selection dialog handlers removed - no longer needed

// Handle app protocol for deep linking (optional)
app.setAsDefaultProtocolClient('almajd-meet');
