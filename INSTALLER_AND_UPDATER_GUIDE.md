# PHat5 Installer and Auto-Updater System

This document provides comprehensive information about the professional installer and auto-updater system implemented for PHat5.

## 🚀 Overview

The PHat5 installer and auto-updater system provides:

- **Professional Installers**: Easy-to-use setup files for Windows, macOS, and Linux
- **Auto-Update System**: Seamless background updates with user control
- **Version Management**: Rollback capabilities and version history
- **Code Signing**: Security and trust through digital signatures
- **User Data Protection**: Preserves settings and data during updates

## 📦 Installer Features

### Windows Installer (NSIS)
- **Setup File**: `PHat5-Setup.exe`
- **Features**:
  - Custom installation directory selection
  - Desktop and Start Menu shortcuts
  - File associations for `.phat5` and `.ph5mix` files
  - Uninstaller with optional user data removal
  - Registry integration for Windows search
  - Auto-updater configuration

### macOS Installer (DMG)
- **Setup File**: `PHat5.dmg`
- **Features**:
  - Drag-and-drop installation
  - Code signing and notarization
  - Gatekeeper compatibility
  - Auto-updater integration

### Linux Packages
- **AppImage**: `PHat5.AppImage` (portable, no installation required)
- **DEB Package**: `PHat5.deb` (Debian/Ubuntu)
- **RPM Package**: `PHat5.rpm` (Red Hat/Fedora)

## 🔄 Auto-Update System

### Core Features
- **Background Checking**: Automatic update detection
- **User Control**: Manual check and install options
- **Progress Tracking**: Real-time download progress
- **Release Notes**: Display changelog and new features
- **Staged Rollouts**: Gradual deployment for stability

### Update Settings
Users can configure:
- **Auto-check frequency**: Hourly to weekly intervals
- **Auto-download**: Download updates automatically
- **Auto-install**: Install updates without prompting (not recommended)
- **Beta updates**: Include pre-release versions

### Update Process
1. **Check**: Background check for new versions
2. **Notify**: Show update notification to user
3. **Download**: Download update package
4. **Install**: Apply update and restart application
5. **Verify**: Confirm successful update

## 🔙 Version Management & Rollback

### Features
- **Version History**: Track all installed versions
- **Backup Creation**: Automatic backup before updates
- **Rollback Capability**: Revert to previous versions
- **Storage Management**: Cleanup old backups

### Rollback Process
1. **Select Version**: Choose from version history
2. **Confirm Action**: Warning about potential feature loss
3. **Backup Current**: Create backup of current version
4. **Restore Files**: Replace with previous version
5. **Restart**: Application restarts with old version

## 🛠️ Development Setup

### Prerequisites
```bash
# Install dependencies
npm install

# For macOS code signing (optional)
npm install @electron/notarize

# For Windows code signing (optional)
# Requires code signing certificate
```

### Environment Variables

#### GitHub Releases (Required for auto-updates)
```bash
export GH_TOKEN="your_github_token"
```

#### Windows Code Signing (Optional)
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

#### macOS Code Signing (Optional)
```bash
export APPLE_ID="your_apple_id"
export APPLE_ID_PASSWORD="app_specific_password"
export APPLE_TEAM_ID="your_team_id"
```

### Build Commands

#### Development Build
```bash
npm run build:prod
npm run electron:pack
```

#### Distribution Build
```bash
npm run electron:dist
```

#### Release Build
```bash
npm run release
```

#### Draft Release
```bash
npm run release:draft
```

## 🔧 Configuration

### Electron Builder Configuration
The `electron-builder.json` file configures:
- Build targets for each platform
- Code signing settings
- Auto-updater integration
- File associations
- Installer customization

### Auto-Updater Configuration
```javascript
// In main.cjs
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Lancej1011',
  repo: 'Power-Hour-at-5',
  private: false
});
```

## 🎯 User Interface

### Update Manager
- **Location**: Top-right toolbar icon
- **Features**:
  - Update status indicator
  - Manual update checking
  - Version history access
  - Update settings

### Update Notification
- **Triggers**: When updates are available
- **Content**: Version info, release notes, download size
- **Actions**: Download, install, or dismiss

### Version Manager
- **Access**: Through update menu
- **Features**: Version history, rollback options, backup management

### Update Settings
- **Access**: Through update menu
- **Options**: Auto-check, download, install preferences

## 🔒 Security

### Code Signing
- **Windows**: Authenticode signing with certificate
- **macOS**: Apple Developer ID signing and notarization
- **Linux**: GPG signing for packages

### Update Security
- **HTTPS**: All update checks use secure connections
- **Signature Verification**: Updates are verified before installation
- **GitHub Releases**: Official distribution channel

## 📊 Monitoring & Analytics

### Update Metrics
- Update check frequency
- Download success rates
- Installation completion
- Rollback usage

### Error Handling
- Network connectivity issues
- Download failures
- Installation errors
- Rollback failures

## 🚨 Troubleshooting

### Common Issues

#### Update Check Fails
- Check internet connection
- Verify GitHub repository access
- Check for firewall blocking

#### Download Fails
- Insufficient disk space
- Network interruption
- Antivirus interference

#### Installation Fails
- Insufficient permissions
- Application still running
- Corrupted download

#### Rollback Fails
- Missing backup files
- Insufficient permissions
- Corrupted backup

### Debug Mode
Enable debug logging:
```bash
# Set environment variable
export DEBUG=electron-updater
```

## 📝 Release Process

### 1. Prepare Release
- Update version in `package.json`
- Update changelog
- Test all features
- Verify build process

### 2. Build Release
```bash
npm run release
```

### 3. Verify Release
- Test installers on target platforms
- Verify auto-updater functionality
- Check code signing

### 4. Publish Release
- GitHub release is created automatically
- Installers are uploaded as assets
- Release notes are generated

## 🔮 Future Enhancements

### Planned Features
- **Delta Updates**: Download only changed files
- **Background Installation**: Install without restart
- **Update Channels**: Stable, beta, alpha channels
- **Rollback Automation**: Automatic rollback on failure
- **Update Scheduling**: Schedule updates for specific times

### Technical Improvements
- **Compression**: Reduce download sizes
- **Caching**: Local update cache
- **Bandwidth Control**: Limit download speed
- **Offline Support**: Handle offline scenarios

## 📞 Support

For issues with the installer or auto-updater:

1. **Check Logs**: Enable debug mode for detailed logs
2. **GitHub Issues**: Report bugs on the repository
3. **Documentation**: Refer to this guide and Electron Builder docs
4. **Community**: Ask questions in discussions

## 📚 References

- [Electron Builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Code Signing Guide](https://www.electron.build/code-signing)
