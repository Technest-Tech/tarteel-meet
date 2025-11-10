const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Media permissions
  requestMediaPermissions: () => ipcRenderer.invoke('request-media-permissions'),
  checkMediaPermissions: () => ipcRenderer.invoke('check-media-permissions'),
  
  // Navigation
  navigateToConference: (url) => ipcRenderer.invoke('navigate-to-conference', url),
  backToEntry: (roomId) => ipcRenderer.invoke('back-to-entry', roomId),
  
  // Screen sharing
  getDisplayMedia: () => ipcRenderer.invoke('get-display-media'),
  checkScreenCaptureSupport: () => ipcRenderer.invoke('check-screen-capture-support'),
  
  // Screen selection dialog (handled directly in dialog)
  
  // Platform info
  platform: process.platform,
  isElectron: true
});
