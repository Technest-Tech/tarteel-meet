# Almajd Meet Desktop - Build Guide for Windows

## 📦 Building Windows Executables (.exe)

This guide will help you build the Almajd Meet Desktop application for Windows (both 64-bit and 32-bit).

## 🎯 What You'll Get

After building, you'll have:

### Installer Versions (NSIS)
- **64-bit Installer**: `Almajd Meet Setup 1.0.0.exe` (x64)
- **32-bit Installer**: `Almajd Meet Setup 1.0.0 ia32.exe` (x86)

### Portable Versions
- **64-bit Portable**: `Almajd-Meet-1.0.0-x64-portable.exe`
- **32-bit Portable**: `Almajd-Meet-1.0.0-ia32-portable.exe`

## 🔧 Prerequisites

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `electron` - The Electron framework
- `electron-builder` - Build tool for creating distributables
- `electron-updater` - For auto-updates

## 🚀 Build Commands

### Build Both 32-bit and 64-bit (Recommended)
```bash
npm run build:win
```

This creates:
- ✅ Windows 64-bit installer
- ✅ Windows 32-bit installer
- ✅ Windows 64-bit portable
- ✅ Windows 32-bit portable

### Build Only 64-bit
```bash
npm run build:win64
```

### Build Only 32-bit
```bash
npm run build:win32
```

## 📁 Output Location

All built files will be in the `dist/` directory:

```
electron-app/
└── dist/
    ├── Almajd Meet Setup 1.0.0.exe          (64-bit installer)
    ├── Almajd Meet Setup 1.0.0 ia32.exe     (32-bit installer)
    ├── Almajd-Meet-1.0.0-x64-portable.exe   (64-bit portable)
    ├── Almajd-Meet-1.0.0-ia32-portable.exe  (32-bit portable)
    └── win-unpacked/                         (unpacked files)
```

## 📋 Step-by-Step Build Process

### On macOS (Your Current System)

1. **Navigate to electron-app directory:**
```bash
cd /Users/ahmedomar/Documents/technest/AlmajdAcademy/almajd-meet-livekit/electron-app
```

2. **Install dependencies (if not done):**
```bash
npm install
```

3. **Build for Windows:**
```bash
npm run build:win
```

4. **Wait for build to complete** (may take 5-10 minutes)
   - electron-builder will download Windows build tools
   - Creates installers and portable versions
   - Packages all files

5. **Find the executables:**
```bash
ls -lh dist/*.exe
```

## 📊 Build Output Details

### Installer Version (NSIS)
- **Features:**
  - ✅ Install wizard with custom installation path
  - ✅ Desktop shortcut creation
  - ✅ Start menu shortcut
  - ✅ Uninstaller included
  - ✅ Installation directory chooser

- **File Names:**
  - `Almajd Meet Setup 1.0.0.exe` (64-bit)
  - `Almajd Meet Setup 1.0.0 ia32.exe` (32-bit)

### Portable Version
- **Features:**
  - ✅ No installation required
  - ✅ Run from any location
  - ✅ Run from USB drive
  - ✅ No admin rights needed

- **File Names:**
  - `Almajd-Meet-1.0.0-x64-portable.exe` (64-bit)
  - `Almajd-Meet-1.0.0-ia32-portable.exe` (32-bit)

## 📤 Distributing to Clients

### For Windows 64-bit Users (Recommended)
Send them:
- **Installer**: `Almajd Meet Setup 1.0.0.exe` (easier for users)
- **OR Portable**: `Almajd-Meet-1.0.0-x64-portable.exe` (no installation)

### For Windows 32-bit Users (Older Systems)
Send them:
- **Installer**: `Almajd Meet Setup 1.0.0 ia32.exe`
- **OR Portable**: `Almajd-Meet-1.0.0-ia32-portable.exe`

### How to Check Windows Version
Tell users to:
1. Press `Windows + Pause/Break` keys
2. Look for "System type"
   - **64-bit** = Use x64 version
   - **32-bit** = Use ia32 version

## 📝 Installation Instructions for Users

### Installer Version

1. **Download** the appropriate installer
2. **Double-click** the .exe file
3. **Follow the installation wizard:**
   - Choose installation directory
   - Select desktop shortcut option
   - Click Install
4. **Launch** from desktop or Start menu

### Portable Version

1. **Download** the portable .exe
2. **Move** to desired location (Desktop, USB drive, etc.)
3. **Double-click** to run
4. **No installation needed!**

## 🔐 Code Signing (Optional)

For production distribution, you should code-sign your executables:

1. **Get a code signing certificate** from a trusted CA
2. **Add to build config:**

```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "your-password",
  "signingHashAlgorithms": ["sha256"]
}
```

**Note:** Without code signing, Windows may show "Unknown Publisher" warnings.

## 🎨 Customization

### Change Version Number
Edit `package.json`:
```json
"version": "1.0.0"
```

### Change App Name
Edit `package.json`:
```json
"productName": "Almajd Meet"
```

### Change Icon
Replace `assets/icon.png` with your custom icon (256x256px or larger)

## 🐛 Troubleshooting

### Build Fails on macOS
```bash
# Install Wine for Windows builds on macOS
brew install wine-stable
```

### "electron-builder not found"
```bash
npm install electron-builder --save-dev
```

### Large File Size
This is normal. Electron apps bundle Chromium and Node.js:
- **Installer**: ~150-200 MB
- **Portable**: ~200-250 MB

### Windows Defender Warning
- Normal for unsigned apps
- Users should click "More info" → "Run anyway"
- Get code signing certificate for production

## 📊 Build Time Estimates

| Build Type | Estimated Time |
|------------|---------------|
| First build (downloads tools) | 10-15 minutes |
| Subsequent builds | 3-5 minutes |
| Both architectures | 5-10 minutes |
| Single architecture | 2-3 minutes |

## 🚀 Quick Reference

```bash
# Install dependencies
npm install

# Build for Windows (32 & 64-bit)
npm run build:win

# Build only 64-bit
npm run build:win64

# Build only 32-bit
npm run build:win32

# Check build output
ls -lh dist/*.exe
```

## 📦 File Sizes (Approximate)

| File Type | 64-bit | 32-bit |
|-----------|--------|--------|
| Installer | ~150 MB | ~140 MB |
| Portable | ~200 MB | ~190 MB |

## ✅ Pre-Distribution Checklist

Before sending to clients:

- [ ] Test installer on Windows 10/11
- [ ] Test portable version
- [ ] Verify all features work (camera, mic, screen share)
- [ ] Test both 32-bit and 64-bit versions
- [ ] Check application launches correctly
- [ ] Verify room joining works
- [ ] Test meeting end → return to entry screen
- [ ] Check production domain connection
- [ ] Create user documentation
- [ ] Consider code signing for production

## 📚 Additional Resources

- **Electron Builder Docs**: https://www.electron.build/
- **NSIS Installer**: https://www.electron.build/configuration/nsis
- **Code Signing**: https://www.electron.build/code-signing

## 🆘 Support

For build issues or questions, check:
1. `electron-builder` logs in console
2. `dist/` directory for error logs
3. Electron Builder documentation
4. GitHub Issues: https://github.com/electron-userland/electron-builder/issues

---

**Ready to build?** Run `npm run build:win` and get your Windows executables! 🎉

