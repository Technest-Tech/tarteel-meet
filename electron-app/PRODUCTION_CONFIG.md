# Almajd Meet Desktop - Production Configuration

## 🌐 Production Domain Setup

The Almajd Meet Desktop application has been configured to use the production domain:

### Configuration Details

**Domain:** `https://almajdmeet.org`

### Files Updated

#### 1. `config.js`
- **Web App URL:** Changed from `http://localhost:3000` to `https://almajdmeet.org`
- **DevTools:** Disabled by default for production use (set `openDevTools: false`)
- **Environment Variable:** Still supports `WEB_APP_URL` environment variable for flexibility

#### 2. `main.js`
- **Navigation Security:** Updated to allow navigation to both:
  - `almajdmeet.org` (production)
  - `localhost:3000` (development/testing)

### How to Use

#### Production Mode (Default)
```bash
npm start
```
The app will connect to `https://almajdmeet.org`

#### Development Mode (Override)
```bash
WEB_APP_URL=http://localhost:3000 npm start
```
The app will connect to your local development server

### Environment Variable Override

You can also create a `.env` file in the `electron-app` directory:

```env
WEB_APP_URL=http://localhost:3000
```

Or for a different production domain:

```env
WEB_APP_URL=https://meet.yourdomain.com
```

### Features

✅ **Automatic Screen Sharing** - Shares primary screen without selection dialog
✅ **Media Permissions** - Handles camera and microphone permissions automatically
✅ **Secure Navigation** - Prevents navigation to unauthorized domains
✅ **Production Ready** - Configured for the production environment

### Building for Distribution

To build the application for distribution:

```bash
npm run build
```

This will create distributable packages in the `dist/` directory.

### Security Notes

- The app only allows navigation to `almajdmeet.org` and `localhost:3000`
- All other external navigation is blocked for security
- Media permissions are handled securely through Electron's permission APIs

### Support

For issues or questions, contact the Almajd Academy technical team.

