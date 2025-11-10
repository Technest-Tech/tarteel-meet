# Quick Build Instructions 🚀

## Build Windows Executables in 2 Steps

### Option 1: Using Build Script (Easiest)

```bash
./build-windows.sh
```

That's it! The script will:
- ✅ Install dependencies if needed
- ✅ Build both 32-bit and 64-bit versions
- ✅ Show you what was created

### Option 2: Using npm

```bash
npm install
npm run build:win
```

## What You'll Get

After building, check the `dist/` folder:

```
dist/
├── Almajd Meet Setup 1.0.0.exe          ← 64-bit installer
├── Almajd Meet Setup 1.0.0 ia32.exe     ← 32-bit installer
├── Almajd-Meet-1.0.0-x64-portable.exe   ← 64-bit portable
└── Almajd-Meet-1.0.0-ia32-portable.exe  ← 32-bit portable
```

## Send to Your Clients

### For Most Users (Windows 10/11)
Send: **Almajd Meet Setup 1.0.0.exe** (64-bit installer)

### For Older Systems
Send: **Almajd Meet Setup 1.0.0 ia32.exe** (32-bit installer)

### For No-Install Users
Send: **Portable version** (runs without installation)

## Build Time
- **First time**: 10-15 minutes (downloads build tools)
- **After that**: 3-5 minutes

## File Sizes
- Each installer: ~150 MB
- Each portable: ~200 MB

## Need Help?
Read the full **BUILD_GUIDE.md** for detailed instructions.

---

**Ready?** Just run `./build-windows.sh` and you're done! 🎉

