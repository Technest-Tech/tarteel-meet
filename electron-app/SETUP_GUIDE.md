# Almajd Meet Desktop - Setup Guide

This guide will help you set up and deploy the Almajd Meet Desktop application.

## Prerequisites

- Node.js 18+ installed
- Your web application running and accessible
- Basic knowledge of command line

## Quick Start

### 1. Installation

```bash
cd electron-app
./install.sh
```

Or manually:
```bash
npm install
```

### 2. Configuration

Edit `config.js` to set your web application URL:

```javascript
module.exports = {
  webAppUrl: 'https://your-domain.com', // Change this to your web app URL
  // ... other settings
};
```

### 3. Development

Start the desktop app in development mode:

```bash
npm run dev
```

### 4. Production Build

Build for your platform:

```bash
./build.sh
```

Or manually:
```bash
# For macOS
npm run build:mac

# For Windows
npm run build:win

# For Linux
npm run build:linux
```

## Configuration Options

### Web Application URL

The desktop app needs to connect to your web application. Update the URL in `config.js`:

```javascript
webAppUrl: 'https://your-domain.com'
```

### Window Settings

Customize the desktop window:

```javascript
window: {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  title: 'Almajd Meet Desktop',
}
```

### Security Settings

The app uses secure defaults:

```javascript
security: {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
}
```

## Features

### Room Entry
- Simple room ID entry (like Flutter app)
- Participant name (optional)
- Host mode by default
- Room validation

### Video Conference
- Full web app features in iframe
- Whiteboard functionality
- Chat system
- Recording capabilities
- Host controls

### Desktop Integration
- Native desktop experience
- Auto-updates
- Keyboard shortcuts
- Fullscreen support

## Keyboard Shortcuts

- `ESC` - Return to room entry
- `F11` - Toggle fullscreen
- `Ctrl/Cmd + R` - Refresh conference

## Deployment

### 1. Build the Application

```bash
./build.sh
```

### 2. Distribute

The built application will be in the `dist/` directory:

- **macOS**: `.dmg` file
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` file

### 3. Auto-Updates

The app includes auto-update functionality. Configure your update server in the build settings.

## Troubleshooting

### Common Issues

1. **"Failed to load video conference"**
   - Check that your web application is running
   - Verify the URL in `config.js`
   - Check network connectivity

2. **"Room not found"**
   - Ensure the room exists in your database
   - Check the API endpoint is accessible
   - Verify room name spelling

3. **App won't start**
   - Check Node.js version (18+ required)
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check for missing assets

### Debug Mode

Run with debug logging:

```bash
DEBUG=* npm run dev
```

### Logs

Check the console output for error messages and debugging information.

## Customization

### Styling

Edit the CSS in `index.html` to customize the appearance.

### Functionality

Modify the JavaScript in `index.html` to add custom features.

### Icons

Replace the icon files in the `assets/` directory:
- `icon.png` - Linux/Windows
- `icon.ico` - Windows
- `icon.icns` - macOS

## Security Considerations

- The app uses secure defaults (context isolation, no node integration)
- External links open in the default browser
- No direct file system access from the renderer process
- All communication goes through the preload script

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the console logs
3. Ensure your web application is working correctly
4. Verify network connectivity

## Development

### File Structure

```
electron-app/
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── index.html           # Main UI
├── config.js            # Configuration
├── package.json         # Dependencies and scripts
├── assets/              # Icons and images
├── dist/                # Built applications
└── README.md            # Documentation
```

### Adding Features

1. **New UI Elements**: Edit `index.html`
2. **New Functionality**: Modify the JavaScript in `index.html`
3. **Native Features**: Add IPC handlers in `main.js`
4. **Configuration**: Update `config.js`

### Testing

Test the application thoroughly:
1. Room entry flow
2. Video conference loading
3. All conference features
4. Error handling
5. Different network conditions
