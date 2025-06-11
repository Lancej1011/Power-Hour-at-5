# PHat5 Release Process & Auto-Updater Guide

## 🚀 How to Release Updates to Users

### Quick Release Process

1. **Update Version Number**
   ```bash
   npm version patch  # For bug fixes (1.1.0 → 1.1.1)
   npm version minor  # For new features (1.1.0 → 1.2.0)
   npm version major  # For breaking changes (1.1.0 → 2.0.0)
   ```

2. **Build and Publish Release**
   ```bash
   npm run electron:publish
   ```

3. **Create GitHub Release**
   - The build process automatically creates a draft release
   - Go to GitHub → Releases → Edit the draft
   - Add release notes and publish

### Detailed Step-by-Step Process

#### Step 1: Prepare for Release

1. **Ensure all changes are committed and pushed**
   ```bash
   git status
   git add .
   git commit -m "feat: your changes description"
   git push origin main
   ```

2. **Update version number**
   ```bash
   # Choose one based on the type of changes:
   npm version patch    # Bug fixes: 1.1.0 → 1.1.1
   npm version minor    # New features: 1.1.0 → 1.2.0
   npm version major    # Breaking changes: 1.1.0 → 2.0.0
   ```

3. **Push the version tag**
   ```bash
   git push origin main --tags
   ```

#### Step 2: Build and Publish

1. **Build for all platforms and publish to GitHub**
   ```bash
   npm run electron:publish
   ```

   This command will:
   - Build the app for Windows, macOS, and Linux
   - Create installers for each platform
   - Upload everything to GitHub Releases
   - Generate update files for auto-updater

#### Step 3: Create Release Notes

1. **Go to your GitHub repository**
   - Navigate to: https://github.com/Lancej1011/Power-Hour-at-5/releases

2. **Find the draft release**
   - electron-builder creates a draft release automatically
   - Click "Edit" on the draft release

3. **Add release notes** (example format):
   ```markdown
   ## 🎉 What's New in v1.2.0

   ### ✨ New Features
   - Added new playlist generation algorithm
   - Improved YouTube integration
   - Enhanced visualizer effects

   ### 🐛 Bug Fixes
   - Fixed audio playback issues
   - Resolved playlist saving problems
   - Improved error handling

   ### 🔧 Improvements
   - Better performance
   - Updated dependencies
   - UI/UX enhancements

   ## 📥 Download

   Choose the installer for your platform:
   - **Windows**: `PHat5-Setup-1.2.0.exe`
   - **macOS**: `PHat5-1.2.0.dmg`
   - **Linux**: `PHat5-1.2.0.AppImage`

   ## 🔄 Auto-Update

   Existing users will be notified of this update automatically.
   ```

4. **Publish the release**
   - Click "Publish release"

## 🔄 How Auto-Updates Work

### For Users
1. **Automatic Check**: App checks for updates every 4 hours
2. **Notification**: Users see an update notification in the app
3. **Download**: Users can choose to download the update
4. **Install**: Update installs automatically and restarts the app

### Update Notification Flow
1. App detects new version on GitHub
2. Shows notification: "Update available: v1.2.0"
3. User clicks "Download Update"
4. Progress bar shows download status
5. "Install and Restart" button appears
6. App installs update and restarts

## 🛠️ Advanced Release Options

### Draft Release (for testing)
```bash
npm run release:draft
```

### Pre-release (beta versions)
```bash
npm run release:prerelease
```

### Build without publishing
```bash
npm run electron:dist
```

## 📋 Release Checklist

Before releasing:
- [ ] All tests pass
- [ ] App builds successfully
- [ ] Version number updated
- [ ] Changelog/release notes prepared
- [ ] All changes committed and pushed

After releasing:
- [ ] GitHub release published
- [ ] Release notes added
- [ ] Test auto-updater with previous version
- [ ] Announce release (if applicable)

## 🔧 Troubleshooting

### Build Fails
- Check that all dependencies are installed: `npm install`
- Clear build cache: `npm run clean`
- Ensure Node.js version compatibility

### Auto-Updater Not Working
- Verify GitHub repository settings in `electron-builder.json`
- Check that releases are published (not draft)
- Ensure app has internet connection

### Code Signing Issues
- Windows: Set up code signing certificate
- macOS: Configure Apple Developer account and notarization

## 📚 Additional Resources

- [electron-builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
