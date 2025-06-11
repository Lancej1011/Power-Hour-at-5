# PHat5 Professional Installer System

This document provides a complete guide to the professional installer and auto-update system implemented for PHat5.

## 🚀 Quick Start

### Building an Installer

1. **Prerequisites:**
   - Node.js 16+ installed
   - All dependencies installed (`npm install`)
   - Application copy in `Installer/PHat5/` directory (already prepared)

2. **Build the installer:**
   ```bash
   npm run build:installer
   ```

3. **Find your installer:**
   - Windows: `installer-output/PHat5-Setup-1.1.0.exe`
   - Output directory: `installer-output/`

### Environment Setup (Optional)

For code signing and GitHub publishing:

```bash
# Windows Code Signing
set CSC_LINK=C:\path\to\certificate.p12
set CSC_KEY_PASSWORD=your_password

# GitHub Publishing
set GH_TOKEN=your_github_token

# Build Options
set BUILD_PLATFORMS=win
set SKIP_CODE_SIGNING=false
```

## 📦 What's Included

### Professional Windows Installer
- **NSIS-based installer** with custom branding
- **Installation wizard** with user-friendly interface
- **Desktop and Start Menu shortcuts**
- **File associations** for .phat5 and .ph5mix files
- **Upgrade detection** and data preservation
- **Professional uninstaller** with optional data cleanup
- **Windows integration** (registry, search, etc.)

### Auto-Update System
- **Automatic update checks** (configurable interval)
- **User-controlled downloads** and installations
- **Real-time progress tracking** with ETA
- **Release notes display** and changelog
- **Update postponement** and scheduling
- **Version history** and rollback capabilities
- **GitHub releases integration**

### Code Signing Support
- **Windows code signing** with certificates
- **SmartScreen compatibility** to reduce warnings
- **Timestamp server** support for long-term validity
- **Automatic signature verification**
- **Enterprise-ready** security features

### Cross-Platform Support
- **Windows** - NSIS installer, portable, and ZIP
- **macOS** - DMG installer with notarization support
- **Linux** - AppImage, DEB, and RPM packages

## 🛠️ Build Commands

### Available Scripts

```bash
# Build installer for current platform
npm run build:installer

# Build for specific platforms
npm run build:installer:win     # Windows only
npm run build:installer:mac     # macOS only  
npm run build:installer:linux   # Linux only
npm run build:installer:all     # All platforms

# Build and publish release
npm run release                 # Stable release
npm run release:draft          # Draft release
npm run release:prerelease     # Pre-release
```

### Build Options

Control the build process with environment variables:

```bash
# Platform selection
BUILD_PLATFORMS=win,mac,linux

# Code signing
SKIP_CODE_SIGNING=true
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=password

# Publishing
PUBLISH_GITHUB=true
GH_TOKEN=github_token

# Debug output
DEBUG=true
```

## 🔧 Configuration

### Electron Builder Configuration

The installer is configured via `electron-builder.json`:

- **Application metadata** and branding
- **Platform-specific settings** for Windows, macOS, Linux
- **Code signing configuration** and certificates
- **Publishing settings** for GitHub releases
- **NSIS installer customization**

### Auto-Update Configuration

Auto-update settings are configurable by users:

- **Automatic checks** - Enable/disable periodic checks
- **Check interval** - How often to check (1-168 hours)
- **Auto download** - Download updates automatically
- **Auto install** - Install on app restart
- **Update channel** - Stable or prerelease updates
- **Postpone updates** - Delay updates for up to 7 days

## 🔐 Code Signing

### Windows Code Signing

1. **Obtain a certificate:**
   - Purchase from DigiCert, Sectigo, or other trusted CA
   - Extended Validation (EV) certificates provide best experience
   - Self-signed certificates for development/testing

2. **Configure signing:**
   ```bash
   set CSC_LINK=C:\path\to\certificate.p12
   set CSC_KEY_PASSWORD=your_password
   ```

3. **Verify setup:**
   ```bash
   node scripts/sign-windows.js path/to/test.exe
   ```

### Benefits of Code Signing

- **Eliminates security warnings** during installation
- **Builds user trust** with verified publisher
- **Meets enterprise requirements** for software deployment
- **Prevents tampering** and ensures authenticity

## 🌐 Distribution

### GitHub Releases (Recommended)

The installer automatically publishes to GitHub releases:

1. **Automated publishing** via build scripts
2. **Release notes** generated from changelog
3. **Auto-update files** (latest.yml) for update checks
4. **Multiple download options** (installer, portable, etc.)

### Manual Distribution

For custom distribution:

1. **Build installers** with `npm run build:installer`
2. **Upload to your server** from `installer-output/`
3. **Include update files** (latest.yml) for auto-updates
4. **Update configuration** to point to your server

## 🔄 Auto-Update Process

### How It Works

1. **Periodic checks** - App checks for updates based on user settings
2. **Update notification** - User is notified of available updates
3. **User choice** - Download now, later, or postpone
4. **Download progress** - Real-time progress with speed and ETA
5. **Installation** - User chooses when to install and restart
6. **Data preservation** - User settings and data are maintained

### Update Channels

- **Stable** - Production releases only (default)
- **Prerelease** - Beta and release candidate versions
- **Custom** - Point to your own update server

### User Controls

Users have full control over updates:

- **Manual checks** - Check for updates on demand
- **Download control** - Choose when to download
- **Installation timing** - Install immediately or on next restart
- **Postpone updates** - Delay for up to 7 days
- **Version history** - View update history and rollback if needed

## 📁 File Structure

```
PHat5/
├── Installer/PHat5/          # Application copy for installer
├── scripts/                  # Build and signing scripts
│   ├── build-installer.js    # Main installer build script
│   ├── sign-windows.js       # Windows code signing
│   ├── installer.nsh         # NSIS installer customization
│   └── after-build.js        # Post-build processing
├── build/                    # Build assets and certificates
│   ├── entitlements.mac.plist
│   └── README.md
├── installer-output/         # Generated installers
├── docs/INSTALLER_GUIDE.md   # Detailed documentation
└── electron-builder.json     # Installer configuration
```

## 🚨 Troubleshooting

### Common Issues

1. **Build fails:**
   - Check Node.js version (16+ required)
   - Verify all dependencies: `npm install`
   - Clear cache: `npm run clean`

2. **Code signing fails:**
   - Verify certificate path and password
   - Check certificate expiration date
   - Ensure SignTool is installed (Windows SDK)

3. **Auto-update not working:**
   - Check GitHub token permissions
   - Verify release is published (not draft)
   - Ensure latest.yml is accessible

4. **Installer won't run:**
   - Check Windows SmartScreen settings
   - Run as administrator if needed
   - Verify code signing certificate

### Debug Mode

Enable detailed logging:

```bash
set DEBUG=true
npm run build:installer
```

### Log Locations

- **Build logs:** Console output during build
- **App logs:** `%APPDATA%/PHat5/logs/`
- **Update logs:** Auto-updater events in app logs

## 🔒 Security Features

### Code Signing
- **Certificate validation** before signing
- **Timestamp servers** for long-term validity
- **Signature verification** after signing
- **Secure certificate storage** recommendations

### Auto-Updates
- **HTTPS-only** update checks and downloads
- **Signature verification** of downloaded updates
- **User consent** required for installation
- **Rollback capability** for problematic updates

### User Data Protection
- **Automatic backup** before updates
- **Secure storage** in user profile directories
- **Optional cleanup** on uninstall
- **No data transmission** without user consent

## 📞 Support

For issues with the installer system:

1. **Check documentation** - This guide and `docs/INSTALLER_GUIDE.md`
2. **Review logs** - Build and application logs for errors
3. **GitHub Issues** - Report bugs and request features
4. **Community support** - Electron and electron-builder communities

## 📄 License

The installer system is part of PHat5 and follows the same MIT license.

---

**Ready to distribute PHat5 professionally!** 🎉

The installer system provides a complete, professional-grade solution for distributing PHat5 to end users with automatic updates, code signing, and cross-platform support.
