# Almajd Meet Desktop

Desktop version of Almajd Academy's video conferencing application built with Electron.

## 🚀 Features

- **Simple Room Entry**: Enter room ID and participant name to join meetings
- **Full Video Conference Features**: All features from the web version
  - Video/audio conferencing with LiveKit
  - Whiteboard functionality
  - Chat system
  - Recording capabilities
  - Host controls
- **Desktop Integration**: Native desktop experience
- **Auto-updates**: Automatic application updates
- **Cross-platform**: Windows, macOS, and Linux support

## 📋 Requirements

- Node.js 18+
- Your web application running and accessible
- Electron 28+

## 🛠️ Installation

### Quick Start

```bash
cd electron-app
./install.sh
```

### Manual Installation

```bash
cd electron-app
npm install
```

## ⚙️ Configuration

1. **Update Web App URL**: Edit `config.js` and set your web application URL:

```javascript
webAppUrl: 'https://your-domain.com'
```

2. **Customize Settings**: Modify other settings in `config.js` as needed.

## 🚀 Usage

### Development

```bash
npm run dev
```

### Production Build

```bash
./build.sh
```

Or build for specific platforms:

```bash
# macOS
npm run build:mac

# Windows  
npm run build:win

# Linux
npm run build:linux
```

## 🏗️ Architecture

### File Structure

```
electron-app/
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── index.html           # Main UI and room entry
├── config.js            # Configuration settings
├── package.json         # Dependencies and scripts
├── assets/              # Icons and images
├── dist/                # Built applications
├── install.sh           # Installation script
├── build.sh             # Build script
├── test-setup.js        # Setup verification
└── README.md            # This file
```

### How It Works

1. **Room Entry**: Simple interface for entering room ID and participant name
2. **Validation**: Validates room exists via API call
3. **Conference**: Loads web application in iframe with full features
4. **Controls**: Desktop-specific controls for navigation and fullscreen

## 🔧 Customization

### Styling

Edit the CSS in `index.html` to customize the appearance.

### Functionality

Modify the JavaScript in `index.html` to add custom features.

### Configuration

Update `config.js` for different settings:

```javascript
module.exports = {
  webAppUrl: 'https://your-domain.com',
  window: {
    width: 1200,
    height: 800,
    // ... other settings
  }
};
```

## 🔒 Security

- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication through preload script
- External links opened in default browser
- No direct file system access from renderer

## ⌨️ Keyboard Shortcuts

- `ESC` - Return to room entry
- `F11` - Toggle fullscreen
- `Ctrl/Cmd + R` - Refresh conference

## 🐛 Troubleshooting

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

```bash
DEBUG=* npm run dev
```

### Test Setup

```bash
node test-setup.js
```

## 📦 Distribution

### Building

```bash
./build.sh
```

The built application will be in the `dist/` directory:

- **macOS**: `.dmg` file
- **Windows**: `.exe` installer  
- **Linux**: `.AppImage` file

### Auto-Updates

The app includes auto-update functionality. Configure your update server in the build settings.

## 🔄 Integration with Web App

The desktop app integrates with your existing web application by:

1. **Room Validation**: Calls your API to validate rooms
2. **Conference Loading**: Loads your web app in an iframe
3. **Feature Parity**: All web app features work in desktop
4. **Host Controls**: Full host functionality available

### API Requirements

Your web application should have:

- Room validation endpoint: `/api/room/validate/{roomName}`
- Room conference page: `/rooms/{roomName}`
- Support for query parameters: `name`, `type`

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [Web App Documentation](../README.md) - Main web application docs

## 🤝 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the console logs  
3. Ensure your web application is working correctly
4. Verify network connectivity
5. Run the test setup script: `node test-setup.js`

## 📄 License

MIT License - see LICENSE file for details.

## 🏢 About

Built for Almajd Academy - providing secure video conferencing for educational and business meetings.

---

**Note**: This desktop app requires your web application to be running and accessible. Make sure to update the `webAppUrl` in `config.js` before building for production.