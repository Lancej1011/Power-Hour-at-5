# Firebase Setup Guide for Power Hour at 5

This guide will help you set up Firebase for the community features in Power Hour at 5, enabling real playlist sharing between users.

## Why Firebase?

Firebase provides:
- **Real-time database** for instant playlist sharing
- **User authentication** for secure access
- **Free tier** that supports most usage scenarios
- **Automatic scaling** as your community grows

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "power-hour-at-5")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll configure security rules later)
4. Select a location for your database (choose one close to your users)
5. Click "Done"

## Step 3: Enable Authentication

1. Click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Anonymous" authentication:
   - Click on "Anonymous"
   - Toggle "Enable"
   - Click "Save"
5. (Optional) Enable "Google" authentication:
   - Click on "Google"
   - Toggle "Enable"
   - Enter your project support email
   - Click "Save"

## Step 4: Configure Security Rules

1. Go back to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared playlists - read public, write authenticated
    match /shared_playlists/{playlistId} {
      allow read: if resource.data.isPublic == true;
      allow write: if request.auth != null && 
                   request.auth.uid == resource.data.creatorId;
      allow create: if request.auth != null;
    }
    
    // Ratings - read all, write own only
    match /playlist_ratings/{ratingId} {
      allow read: if true;
      allow write: if request.auth != null && 
                   request.auth.uid == resource.data.userId;
    }
    
    // Downloads - read own, write own
    match /playlist_downloads/{downloadId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.userId;
    }
    
    // Users - read/write own profile only
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == userId;
    }
  }
}
```

4. Click "Publish"

## Step 5: Get Configuration Keys

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click "Add app" and select the web icon (</>)
5. Enter an app nickname (e.g., "Power Hour at 5")
6. Click "Register app"
7. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env` in your project root
2. Fill in the Firebase configuration values:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. Save the file and restart your development server

## Step 7: Test the Setup

1. Start your application
2. Go to the Community tab
3. Try creating and sharing a playlist
4. Check the Firebase console to see if data appears in Firestore

## Troubleshooting

### "Firebase not configured" message
- Check that all environment variables are set correctly
- Restart the development server after changing `.env`
- Verify the Firebase project is active

### "Permission denied" errors
- Check that Firestore security rules are published
- Verify authentication is working (check browser console)
- Make sure the user is signed in (anonymous sign-in should happen automatically)

### Playlists not appearing in community
- Check that playlists are marked as "public" when sharing
- Verify the playlist was saved to Firestore (check Firebase console)
- Try refreshing the community page

## Cost Considerations

**Firebase Free Tier (Spark Plan):**
- 50K reads/day, 20K writes/day
- 1GB storage
- 10GB bandwidth/month

This is sufficient for:
- Small communities (up to ~100 active users)
- Moderate playlist sharing activity
- Development and testing

**Paid Tier (Blaze Plan):**
- Pay-as-you-go pricing
- Required for larger communities
- Typically $25-100/month for medium-sized communities

## Security Notes

- The current setup uses anonymous authentication for simplicity
- Users are automatically signed in when they visit the community page
- All shared playlists are public by default
- Private playlists can only be accessed via share codes

## Next Steps

Once Firebase is set up and working:
1. Test playlist sharing between different browsers/devices
2. Monitor usage in the Firebase console
3. Consider enabling Google authentication for persistent user accounts
4. Set up Firebase Analytics to track community engagement

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration in the Firebase console
3. Ensure your `.env` file has the correct values
4. Try clearing browser cache and localStorage

The application will fall back to local-only storage if Firebase is not configured, so existing functionality will continue to work.
