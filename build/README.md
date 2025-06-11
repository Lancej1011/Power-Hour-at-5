# Build Assets

This directory contains assets used during the installer build process.

## Required Files

### Installer Graphics

- `installer-header.bmp` - Header image for NSIS installer (150x57 pixels)
- `installer-sidebar.bmp` - Sidebar image for NSIS installer (164x314 pixels)
- `uninstaller-sidebar.bmp` - Sidebar image for uninstaller (164x314 pixels)

### Code Signing

- Place your code signing certificate (`.p12` or `.pfx`) here
- Set the `CSC_LINK` environment variable to point to the certificate file
- Set the `CSC_KEY_PASSWORD` environment variable with the certificate password

### macOS Notarization

- `entitlements.mac.plist` - macOS entitlements file
- Apple ID and app-specific password required for notarization

## Creating Graphics

### NSIS Installer Graphics

The installer graphics should match your application's branding:

1. **Header Image (150x57 pixels):**
   - Used in the installer header
   - Should contain your logo and application name
   - Format: 24-bit BMP

2. **Sidebar Image (164x314 pixels):**
   - Used in the installer sidebar
   - Can be a larger version of your logo or branded graphic
   - Format: 24-bit BMP

3. **Uninstaller Sidebar (164x314 pixels):**
   - Used in the uninstaller
   - Can be the same as installer sidebar or a variant
   - Format: 24-bit BMP

### Creating with GIMP/Photoshop

1. Create new image with exact dimensions
2. Design your graphics with appropriate branding
3. Export as 24-bit BMP format
4. Place in this directory

## Code Signing Certificate

### Obtaining a Certificate

1. **Commercial Certificate:**
   - Purchase from DigiCert, Sectigo, or other trusted CA
   - Extended Validation (EV) certificates provide best user experience
   - Standard code signing certificates also work

2. **Self-Signed Certificate (Development Only):**
   ```powershell
   # Create self-signed certificate for testing
   New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=PHat5 Development" -KeyUsage DigitalSignature -FriendlyName "PHat5 Code Signing" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
   ```

### Certificate Setup

1. Export certificate to `.p12` format
2. Place in secure location (not in repository)
3. Set environment variables:
   ```bash
   CSC_LINK=C:\path\to\certificate.p12
   CSC_KEY_PASSWORD=your_password
   ```

## macOS Setup

### Entitlements File

Create `entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

### Apple Developer Setup

1. Join Apple Developer Program
2. Create App ID and certificates
3. Set environment variables:
   ```bash
   APPLE_ID=your@apple.id
   APPLE_ID_PASSWORD=app-specific-password
   APPLE_TEAM_ID=your-team-id
   ```

## Security Notes

- **Never commit certificates to version control**
- **Use secure storage for certificates and passwords**
- **Rotate certificates before expiration**
- **Test signing process in development environment**

## Troubleshooting

### Common Issues

1. **Graphics not showing:**
   - Check file format (must be 24-bit BMP)
   - Verify exact pixel dimensions
   - Ensure files are in correct location

2. **Code signing fails:**
   - Verify certificate path and password
   - Check certificate expiration
   - Ensure SignTool is installed

3. **macOS notarization fails:**
   - Verify Apple ID credentials
   - Check entitlements file
   - Ensure app is properly signed first
