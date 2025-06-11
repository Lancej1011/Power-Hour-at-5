# Code Signing Setup Guide for PHat5

This guide will help you set up code signing for Windows and macOS to create trusted, professional installers.

## 🪟 **Windows Code Signing**

### **Option 1: Self-Signed Certificate (For Testing)**

#### Create a Self-Signed Certificate
```powershell
# Run PowerShell as Administrator
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=PHat5 Development" -KeyUsage DigitalSignature -FriendlyName "PHat5 Code Signing" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
```

#### Export Certificate
1. Open `certmgr.msc` (Certificate Manager)
2. Navigate to `Personal > Certificates`
3. Find your "PHat5 Development" certificate
4. Right-click → `All Tasks` → `Export`
5. Choose "Yes, export the private key"
6. Select "Personal Information Exchange (.pfx)"
7. Set a password and save as `phat5-cert.pfx`

#### Set Environment Variables
```bash
# Windows (Command Prompt)
set CSC_LINK=C:\path\to\phat5-cert.pfx
set CSC_KEY_PASSWORD=your_certificate_password

# Windows (PowerShell)
$env:CSC_LINK="C:\path\to\phat5-cert.pfx"
$env:CSC_KEY_PASSWORD="your_certificate_password"

# Add to your .env file (create if doesn't exist)
CSC_LINK=C:\path\to\phat5-cert.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

### **Option 2: Commercial Certificate (For Production)**

#### Purchase from Certificate Authority
- **DigiCert**: https://www.digicert.com/code-signing/
- **Sectigo**: https://sectigo.com/ssl-certificates-tls/code-signing
- **GlobalSign**: https://www.globalsign.com/en/code-signing-certificate

#### Install Certificate
1. Download your certificate from the CA
2. Install it in Windows Certificate Store
3. Export as .pfx file with private key
4. Set environment variables as above

## 🍎 **macOS Code Signing**

### **Prerequisites**
- Apple Developer Account ($99/year)
- Xcode installed
- Developer ID Application certificate

### **Step 1: Get Apple Developer Account**
1. Visit https://developer.apple.com/
2. Sign up for Apple Developer Program
3. Pay the annual fee ($99)

### **Step 2: Create Certificates**
1. Open Xcode
2. Go to `Xcode > Preferences > Accounts`
3. Add your Apple ID
4. Select your team
5. Click "Manage Certificates"
6. Click "+" and select "Developer ID Application"

### **Step 3: Set Environment Variables**
```bash
# Add to your .env file or shell profile
export APPLE_ID="your_apple_id@example.com"
export APPLE_ID_PASSWORD="app_specific_password"
export APPLE_TEAM_ID="your_team_id"

# Alternative: Use keychain profile
export APPLE_KEYCHAIN_PROFILE="AC_PASSWORD"
```

### **Step 4: Create App-Specific Password**
1. Go to https://appleid.apple.com/
2. Sign in with your Apple ID
3. Go to "Security" section
4. Generate an app-specific password
5. Use this password for `APPLE_ID_PASSWORD`

### **Step 5: Find Your Team ID**
1. Go to https://developer.apple.com/account/
2. Click on "Membership" in the sidebar
3. Your Team ID is displayed there

## 🔧 **Environment Configuration**

### **Create .env File**
Create a `.env` file in your project root:

```bash
# GitHub token for releases
GH_TOKEN=your_github_personal_access_token

# Windows Code Signing
CSC_LINK=C:\path\to\your\certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password

# macOS Code Signing
APPLE_ID=your_apple_id@example.com
APPLE_ID_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_team_id

# Optional: Skip code signing for testing
# SKIP_CODE_SIGNING=true
# SKIP_NOTARIZATION=true
```

### **Load Environment Variables**
Add this to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Load PHat5 environment variables
if [ -f "/path/to/phat5/.env" ]; then
    export $(cat /path/to/phat5/.env | grep -v '^#' | xargs)
fi
```

## 🚀 **Testing Code Signing**

### **Test Windows Signing**
```bash
# Build with signing
npm run electron:dist

# Verify signature
signtool verify /pa "dist-electron\PHat5 Setup.exe"
```

### **Test macOS Signing**
```bash
# Build with signing
npm run electron:dist

# Verify signature
codesign -dv --verbose=4 "dist-electron/PHat5.app"

# Test notarization
spctl -a -t exec -vv "dist-electron/PHat5.app"
```

## 🔍 **Troubleshooting**

### **Windows Issues**

#### "Certificate not found"
- Ensure certificate is in Windows Certificate Store
- Check CSC_LINK path is correct
- Verify certificate password

#### "Timestamp server unavailable"
- This is usually temporary
- electron-builder will retry automatically
- Check internet connection

### **macOS Issues**

#### "No signing identity found"
- Ensure Developer ID certificate is installed
- Check Keychain Access for certificate
- Verify APPLE_TEAM_ID is correct

#### "Notarization failed"
- Check Apple ID credentials
- Ensure app-specific password is correct
- Verify internet connection

#### "App is damaged"
- This happens with unsigned apps
- Users need to allow in Security preferences
- Proper signing/notarization fixes this

## 🎯 **Quick Start (No Code Signing)**

If you want to test releases without code signing:

```bash
# Set environment variables to skip signing
export SKIP_CODE_SIGNING=true
export SKIP_NOTARIZATION=true

# Or add to .env file
echo "SKIP_CODE_SIGNING=true" >> .env
echo "SKIP_NOTARIZATION=true" >> .env

# Build release
npm run release:draft
```

**Note**: Unsigned apps will show security warnings to users.

## 📋 **Checklist**

### **Before First Release**
- [ ] Set up GitHub Personal Access Token
- [ ] Configure code signing certificates
- [ ] Test build process locally
- [ ] Verify signatures work
- [ ] Create draft release to test

### **For Each Release**
- [ ] Update version in package.json
- [ ] Test application thoroughly
- [ ] Run `npm run release:draft` first
- [ ] Test the draft release
- [ ] Run `npm run release` for final release

## 🔗 **Useful Links**

- [Electron Builder Code Signing](https://www.electron.build/code-signing)
- [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Microsoft Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
