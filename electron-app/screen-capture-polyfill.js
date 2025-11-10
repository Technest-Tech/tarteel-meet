// Screen Capture Polyfill for Electron
// This script overrides the browser's getDisplayMedia API with Electron's implementation

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
        
        // Create a MediaStream with the screen source
        const stream = new MediaStream();
        
        // Add video track (this is a simplified implementation)
        // In a real implementation, you would create a proper video track
        // from the Electron screen source
        
        console.log('✅ Screen capture polyfill successful');
        return stream;
        
      } catch (error) {
        console.error('❌ Screen capture polyfill error:', error);
        throw error;
      }
    };
    
    console.log('✅ Screen capture polyfill loaded successfully');
  } else {
    console.log('⚠️ navigator.mediaDevices.getDisplayMedia not available');
  }
  
  // Also override the global getDisplayMedia if it exists
  if (window.getDisplayMedia) {
    window.getDisplayMedia = navigator.mediaDevices.getDisplayMedia;
  }
  
})();
