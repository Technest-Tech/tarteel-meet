# Almajd Meet Desktop - Meeting End Flow

## 🔄 Return to Entry Screen Feature

After a meeting ends or when the user leaves, the app automatically returns to the entry screen with the room ID pre-filled for easy rejoining.

## 🎯 How It Works

### Automatic Detection

The app monitors for several events that indicate the meeting has ended:

1. **Leave Meeting Button**: User clicks "Leave" or "End Meeting"
2. **Navigation Away**: User navigates to home page or admin
3. **URL Changes**: Navigation to `/` or other non-meeting pages
4. **Back Button**: User uses browser back button
5. **Window Unload**: User closes the meeting tab

### User Experience Flow

```
┌─────────────────┐
│  Entry Screen   │
│   (Room ID: 1)  │
└────────┬────────┘
         │ User enters Room 1
         ▼
┌─────────────────┐
│  In Meeting     │
│   (Room 1)      │
└────────┬────────┘
         │ User leaves/ends meeting
         ▼
┌─────────────────┐
│  Entry Screen   │
│   (Room ID: 1)  │ ← Room ID preserved!
└─────────────────┘
```

## 🔧 Technical Implementation

### 1. IPC Handler (main.js)

```javascript
ipcMain.handle('back-to-entry', async (event, roomId) => {
  // Load the entry screen
  await mainWindow.loadFile('index.html');
  
  // Wait for DOM ready and inject room ID
  mainWindow.webContents.once('dom-ready', () => {
    if (roomId) {
      mainWindow.webContents.executeJavaScript(`
        setTimeout(() => {
          const roomInput = document.getElementById('room-name');
          if (roomInput) {
            roomInput.value = '${roomId}';
          }
        }, 500);
      `);
    }
  });
});
```

### 2. Preload API (preload.js)

```javascript
backToEntry: (roomId) => ipcRenderer.invoke('back-to-entry', roomId)
```

### 3. Meeting End Handler (injected into web pages)

The handler monitors for:

#### URL Changes
```javascript
history.pushState = function() {
  originalPushState.apply(history, arguments);
  checkForLeave(arguments[2]);
};
```

#### Button Clicks
```javascript
document.addEventListener('click', function(e) {
  const target = e.target;
  if (target.textContent?.toLowerCase().includes('leave') ||
      target.textContent?.toLowerCase().includes('end meeting')) {
    window.electronAPI.backToEntry(roomId);
  }
}, true);
```

#### Navigation Events
```javascript
window.addEventListener('popstate', function(e) {
  checkForLeave(window.location.href);
});
```

## 📋 Detected Events

### Automatic Return Triggers

| Event | Description | Detection Method |
|-------|-------------|------------------|
| **Leave Button** | User clicks leave/end meeting | Click event listener |
| **Home Navigation** | Navigate to `/` | URL change detection |
| **Admin Navigation** | Navigate to `/admin` | URL change detection |
| **Back Button** | Browser back button | `popstate` event |
| **Page Unload** | Window/tab closing | `beforeunload` event |

## 🎨 User Experience Benefits

### Quick Rejoin
1. **Meeting ends** → Automatically returns to entry
2. **Room ID preserved** → No need to re-enter
3. **One click rejoin** → Just press "JOIN MEETING" again

### Error Recovery
1. **Connection lost** → Can quickly rejoin
2. **Accidental leave** → Easy to get back
3. **Multiple sessions** → Rejoin same room easily

## 🔍 URL Pattern Recognition

The handler is activated when the URL matches:
- `/{roomId}/h` - Production format (e.g., `/1/h`, `/2/h`)
- `/rooms/{roomName}` - Development format

### Room ID Extraction

```javascript
const urlMatch = currentUrl.match(/\/(\d+)\/h/);
const roomId = urlMatch ? urlMatch[1] : '';
```

## 💡 Examples

### Example 1: Normal Leave

```
1. User in Room 1 (https://almajdmeet.org/1/h)
2. User clicks "Leave Meeting"
3. Handler detects leave action
4. Calls window.electronAPI.backToEntry('1')
5. App returns to entry screen with Room ID = '1'
```

### Example 2: Accidental Navigation

```
1. User in Room 5 (https://almajdmeet.org/5/h)
2. User accidentally navigates to home
3. Handler detects URL change to '/'
4. Calls window.electronAPI.backToEntry('5')
5. App returns to entry screen with Room ID = '5'
```

### Example 3: Meeting End

```
1. Host in Room 10 (https://almajdmeet.org/10/h)
2. Host clicks "End Meeting"
3. Handler detects end action
4. Calls window.electronAPI.backToEntry('10')
5. App returns to entry screen with Room ID = '10'
```

## 🛠️ Manual Return

Users can also manually return to the entry screen using:

### Keyboard Shortcut
- **macOS/Linux**: `Cmd+B`
- **Windows**: `Ctrl+B`

### Menu Option
- **View** → **Back to Room Entry**

Note: Manual return via menu/shortcut does not preserve the room ID.

## 🚀 Benefits

✅ **Seamless Experience** - Automatic return without user intervention
✅ **Quick Rejoin** - Room ID preserved for easy access
✅ **Error Recovery** - Easy to rejoin after disconnection
✅ **User Friendly** - No need to remember room IDs
✅ **Flexible** - Works with multiple detection methods
✅ **Reliable** - Multiple fallback detection methods

## 📝 Notes

- The room ID is extracted from the URL pattern `/{roomId}/h`
- A 500ms delay ensures the DOM is fully loaded before injecting the room ID
- The handler only activates on conference pages (URLs with `/h` or `/rooms/`)
- Multiple detection methods ensure the return happens reliably

