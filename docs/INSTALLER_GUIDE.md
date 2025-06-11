# PHat5 Professional Installer System

This guide covers the complete professional installer and auto-update system for PHat5, including installation, code signing, and distribution.

## Overview

The PHat5 installer system provides:

- **Professional Windows Installers** - NSIS-based installers with custom UI
- **Auto-Update System** - Seamless updates via GitHub releases
- **Code Signing** - Windows code signing for security and trust
- **Cross-Platform Support** - Windows, macOS, and Linux installers
- **User Data Preservation** - Maintains settings and data during updates
- **Version Management** - Rollback capabilities and version history

## Quick Start

### Building an Installer

1. **Prepare the application copy in the Installer folder** (already done)
2. **Build the installer:**
   ```bash
   npm run build:installer
   ```
3. **Find the installer in:** `installer-output/`

### Environment Variables

Set these environment variables for full functionality:

```bash
# Code Signing (Windows)
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=your_certificate_password

# GitHub Publishing
GH_TOKEN=your_github_token

# Build Options
BUILD_PLATFORMS=win,mac,linux
SKIP_CODE_SIGNING=false
PUBLISH_GITHUB=true
```

## Installer Features

### Windows Installer (NSIS)

- **Professional UI** with custom branding
- **Installation Options** - Desktop shortcuts, file associations
- **Upgrade Detection** - Detects existing installations
- **User Data Backup** - Preserves data during upgrades
- **Uninstaller** - Complete removal with optional data cleanup
- **Registry Integration** - Proper Windows integration
- **File Associations** - .phat5 and .ph5mix files

### Auto-Update System

The auto-updater provides:

- **Automatic Checks** - Configurable check intervals
- **User Control** - Manual download and install options
- **Progress Tracking** - Real-time download progress
- **Release Notes** - Display changelog and features
- **Postpone Updates** - User can delay updates
- **Version History** - Track update history
- **Rollback Support** - Revert to previous versions

### Code Signing

Windows executables and installers are code-signed for:

- **Security** - Prevents tampering warnings
- **Trust** - Users can verify authenticity
- **SmartScreen** - Reduces Windows security warnings
- **Enterprise** - Meets corporate security requirements

## Configuration

### Electron Builder Configuration

The installer is configured via `electron-builder.json`:

```json
{
  "appId": "com.phat5.app",
  "productName": "PHat5",
  "win": {
    "target": ["nsis", "portable", "zip"],
    "sign": "./scripts/sign-windows.js",
    "certificateFile": "${env.CSC_LINK}",
    "certificatePassword": "${env.CSC_KEY_PASSWORD}"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "include": "scripts/installer.nsh"
  },
  "publish": {
    "provider": "github",
    "owner": "Lancej1011",
    "repo": "Power-Hour-at-5"
  }
}
```

### Auto-Update Settings

Users can configure auto-updates in the application:

- **Auto Check** - Enable/disable automatic update checks
- **Check Interval** - How often to check (hours)
- **Auto Download** - Automatically download updates
- **Auto Install** - Install updates on app restart
- **Update Channel** - Stable or prerelease updates

## Code Signing Setup

### Windows Code Signing

1. **Obtain a Code Signing Certificate:**
   - Purchase from a trusted CA (DigiCert, Sectigo, etc.)
   - Or use a self-signed certificate for testing

2. **Set Environment Variables:**
   ```bash
   CSC_LINK=C:\path\to\certificate.p12
   CSC_KEY_PASSWORD=your_password
   ```

3. **Install SignTool:**
   - Included with Windows SDK
   - Or Visual Studio Build Tools

4. **Test Signing:**
   ```bash
   node scripts/sign-windows.js path/to/file.exe
   ```

### Certificate Requirements

- **Extended Validation (EV)** certificates are recommended
- **Standard Code Signing** certificates work but may show warnings
- **Self-signed** certificates for development only

## Distribution

### GitHub Releases

The installer automatically publishes to GitHub releases:

1. **Create Release** - Automated via build script
2. **Upload Artifacts** - Installers and update files
3. **Release Notes** - Generated from changelog
4. **Auto-Update Files** - latest.yml for update checks

### Manual Distribution

For manual distribution:

1. **Build Installers:**
   ```bash
   npm run build:installer
   ```

2. **Upload to Your Server:**
   - Copy files from `installer-output/`
   - Include `latest.yml` for auto-updates

3. **Update Configuration:**
   - Modify `publish` section in electron-builder.json
   - Point to your update server

## Build Scripts

### Available Scripts

- `npm run build:installer` - Build complete installer
- `npm run build:production` - Build app only
- `npm run release` - Build and publish release
- `npm run release:draft` - Create draft release

### Custom Build Options

Set environment variables to customize builds:

```bash
# Build specific platforms
BUILD_PLATFORMS=win,mac,linux

# Skip code signing
SKIP_CODE_SIGNING=true

# Create draft release
DRAFT_RELEASE=true

# Enable debug output
DEBUG=true
```

## Troubleshooting

### Common Issues

1. **Code Signing Fails:**
   - Check certificate path and password
   - Ensure SignTool is installed
   - Verify certificate is not expired

2. **Build Fails:**
   - Check Node.js version (16+ required)
   - Verify all dependencies are installed
   - Clear node_modules and reinstall

3. **Auto-Update Not Working:**
   - Check GitHub token permissions
   - Verify release is published (not draft)
   - Ensure latest.yml is accessible

4. **Installer Won't Run:**
   - Check Windows SmartScreen settings
   - Verify code signing certificate
   - Run as administrator if needed

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm run build:installer
```

### Log Files

Check these locations for logs:

- **Build Logs:** Console output during build
- **App Logs:** `%APPDATA%/PHat5/logs/`
- **Update Logs:** Auto-updater events in app logs

## Security Considerations

### Code Signing

- **Always sign** production releases
- **Protect certificates** - Use secure storage
- **Timestamp signatures** - Ensures validity after cert expires
- **Verify signatures** - Test signed files before distribution

### Auto-Updates

- **HTTPS only** - All update checks use secure connections
- **Signature verification** - Updates are verified before installation
- **User consent** - Users control when updates are installed
- **Rollback capability** - Can revert problematic updates

### User Data

- **Backup before updates** - User data is preserved
- **Secure storage** - Settings stored in user profile
- **Optional cleanup** - User chooses data removal on uninstall

## Advanced Configuration

### Custom Installer UI

Modify `scripts/installer.nsh` for custom installer behavior:

- Custom pages and dialogs
- Additional installation options
- Registry modifications
- File associations

### Update Channels

Configure different update channels:

```javascript
// In main.cjs
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Lancej1011',
  repo: 'Power-Hour-at-5',
  channel: 'beta' // or 'alpha', 'stable'
});
```

### Enterprise Deployment

For enterprise environments:

- **MSI Installers** - Enable in electron-builder.json
- **Group Policy** - Configure auto-update settings
- **Network Installation** - Deploy from network share
- **Silent Installation** - Use command-line switches

## Support

For issues with the installer system:

1. **Check Documentation** - This guide and electron-builder docs
2. **Review Logs** - Build and application logs
3. **GitHub Issues** - Report bugs and feature requests
4. **Community** - Electron and electron-builder communities

## License

The installer system is part of PHat5 and follows the same MIT license.
