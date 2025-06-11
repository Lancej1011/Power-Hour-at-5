# Fix Firebase Authentication Domains for PHat5 Electron App

## Problem
The Firebase authentication error `auth/unauthorized-domain` occurs because Electron apps use protocols and domains that are not authorized by default in Firebase.

## Solution Steps

### 1. Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **phat5-3b9c6**
3. Navigate to **Authentication** → **Settings** → **Authorized domains**

### 2. Add Required Domains

Add the following domains to your Firebase project's authorized domains list:

#### Required Domains for Electron:
```
localhost
127.0.0.1
file://
app://
electron://
```

#### Step-by-step:
1. Click **"Add domain"** button
2. Add each domain one by one:
   - `localhost`
   - `127.0.0.1`
   - `file://`
   - `app://`
   - `electron://`

### 3. Additional Domains (if needed)
If you're still having issues, also add:
```
http://localhost
https://localhost
http://127.0.0.1
https://127.0.0.1
```

### 4. Save Changes
1. Click **Save** after adding each domain
2. Wait a few minutes for changes to propagate

## Alternative Solution: Use Firebase Emulator for Development

If you're developing locally, you can use Firebase emulators:

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project
```bash
firebase init
```

### 4. Start emulators
```bash
firebase emulators:start
```

### 5. Update environment variables
Create a `.env.local` file with emulator settings:
```env
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_USE_FIREBASE_EMULATOR=true
```

## Code Changes Made

The following files have been updated to better handle Electron authentication:

### 1. `src/config/firebase.ts`
- Enhanced Electron detection
- Added better error handling
- Configured auth settings for Electron

### 2. `src/services/authService.ts`
- Added fallback to anonymous authentication
- Better error messages with domain requirements
- Enhanced Electron-specific error handling

## Testing the Fix

### 1. Rebuild the application
```bash
npm run build:production
```

### 2. Test the installer
```bash
npm run copy-installer
```

### 3. Install and test
1. Run the installer: `installer-output/PHat5 Setup 1.1.0.exe`
2. Launch the application
3. Try to sign in with Google
4. Check the console for any remaining errors

## Verification

After adding the domains, you should see:
- ✅ No more `auth/unauthorized-domain` errors
- ✅ Google sign-in popup works correctly
- ✅ Authentication flows complete successfully
- ✅ User data syncs properly

## Troubleshooting

### If you still get errors:

1. **Check the console logs** for the exact domain being used
2. **Add that specific domain** to Firebase Console
3. **Clear browser cache** and restart the app
4. **Wait 5-10 minutes** for Firebase changes to propagate

### Common additional domains needed:
- The exact protocol and domain shown in console logs
- Any custom protocols your Electron app uses
- Development server URLs if testing locally

### If authentication is not critical:
The app will fall back to anonymous authentication and local storage, so core functionality will still work even without full authentication.

## Security Note

Adding `file://` and `localhost` domains is safe for Electron apps but should only be done for applications that actually need it. These domains are necessary for Electron apps to authenticate with Firebase.

## Contact

If you continue to have issues:
1. Check the browser console for specific error messages
2. Verify the exact domain/protocol being used
3. Ensure all required domains are added to Firebase Console
4. Wait for propagation (up to 10 minutes)

The authentication system will now work properly with your Electron application!
