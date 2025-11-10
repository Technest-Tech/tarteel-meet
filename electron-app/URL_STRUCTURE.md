# Almajd Meet Desktop - URL Structure

## 🌐 Production URL Format

The Almajd Meet Desktop application uses the production URL structure from [almajdmeet.org](https://almajdmeet.org).

### URL Pattern

**Format:** `https://almajdmeet.org/{roomId}/h`

Where:
- `{roomId}` - The room ID number (e.g., 1, 2, 3, etc.)
- `/h` - Indicates **host mode** (full meeting control and whiteboard access)

### Examples

```
https://almajdmeet.org/1/h
https://almajdmeet.org/2/h
https://almajdmeet.org/123/h
```

## 📋 User Experience

### Entry Screen

1. **Room ID Input:**
   - Label: "Room ID"
   - Placeholder: "Enter room ID (e.g., 1, 2, 3...)"
   - User enters the numeric room ID

2. **Your Name (Optional):**
   - Label: "Your Name (Optional)"
   - Placeholder: "Enter your name"
   - Defaults to "Host" if left empty

3. **Host Mode:**
   - All desktop users join as hosts
   - Full meeting control
   - Whiteboard access
   - Can end meetings
   - Can remove participants

### URL Construction

When a user enters room ID `1` and clicks "JOIN MEETING":
```javascript
// Input
roomId = "1"

// Generated URL
conferenceUrl = "https://almajdmeet.org/1/h"

// The app navigates to this URL
```

## 🔧 Technical Details

### Code Implementation

**File:** `electron-app/index.html`

```javascript
async startVideoConference(roomName, participantName) {
    const baseUrl = window.APP_CONFIG?.webAppUrl || 'https://almajdmeet.org';
    
    // Use the production URL structure: /{roomId}/h for host mode
    const conferenceUrl = `${baseUrl}/${encodeURIComponent(roomName)}/h`;
    
    await window.electronAPI.navigateToConference(conferenceUrl);
}
```

### Configuration

**File:** `electron-app/config.js`

```javascript
webAppUrl: process.env.WEB_APP_URL || 'https://almajdmeet.org'
```

### Navigation Security

**File:** `electron-app/main.js`

The app allows navigation to:
- ✅ `almajdmeet.org` (production)
- ✅ `localhost:3000` (development)
- ❌ All other external URLs are blocked

## 🚀 Usage Examples

### Joining Room 1
1. Open Almajd Meet Desktop
2. Enter Room ID: `1`
3. Enter Your Name: `Ahmed` (optional)
4. Click "JOIN MEETING"
5. App navigates to: `https://almajdmeet.org/1/h`

### Joining Room 123
1. Open Almajd Meet Desktop
2. Enter Room ID: `123`
3. Click "JOIN MEETING"
4. App navigates to: `https://almajdmeet.org/123/h`

## 📝 Notes

- **Room IDs must be created first** through the admin dashboard at `https://almajdmeet.org/admin`
- All desktop users join as **hosts** (indicated by `/h` in the URL)
- The participant name is no longer passed in the URL (handled by the web app)
- Screen sharing works automatically with the desktop app

## 🔄 Development Mode

For development/testing, you can override the base URL:

```bash
WEB_APP_URL=http://localhost:3000 npm start
```

This will use: `http://localhost:3000/{roomId}/h`

## 🆚 URL Structure Comparison

### Desktop App (Host Mode)
```
https://almajdmeet.org/{roomId}/h
```

### Web App (Guest Mode)
```
https://almajdmeet.org/{roomId}/g
```

The desktop app always uses `/h` (host mode) for full functionality.

