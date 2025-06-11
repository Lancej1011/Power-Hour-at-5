# Firebase Setup Instructions

## Required Firestore Indexes

The collaboration features require specific Firestore indexes to function properly. When you see errors about missing indexes, follow these steps:

### 1. Collaboration Invitations Index

**Error Message:**
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/phat5-3b9c6/firestore/indexes?create_composite=...
```

**Solution:**
1. Click the link provided in the error message, OR
2. Go to [Firebase Console](https://console.firebase.google.com/)
3. Select your project (`phat5-3b9c6`)
4. Navigate to Firestore Database → Indexes
5. Click "Create Index"
6. Configure the index as follows:

**Collection ID:** `collaboration_invitations`

**Fields to index:**
- `inviterId` (Ascending)
- `createdAt` (Ascending)
- `__name__` (Ascending)

**Query scope:** Collection

### 2. Additional Indexes You May Need

As you use more collaboration features, you might need these additional indexes:

#### Playlist Operations Index
**Collection:** `playlist_operations`
**Fields:**
- `playlistId` (Ascending)
- `timestamp` (Descending)

#### User Presence Index
**Collection:** `user_presence`
**Fields:**
- `playlistId` (Ascending)
- `timestamp` (Descending)

### 3. Automatic Index Creation

Firebase will automatically suggest indexes when you encounter missing index errors. The error messages include direct links to create the required indexes.

### 4. Security Rules

Make sure your Firestore security rules allow the collaboration operations. Example rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Collaborative playlists
    match /collaborative_playlists/{playlistId} {
      allow read, write: if request.auth != null;
    }
    
    // Collaboration invitations
    match /collaboration_invitations/{invitationId} {
      allow read, write: if request.auth != null;
    }
    
    // Playlist operations
    match /playlist_operations/{operationId} {
      allow read, write: if request.auth != null;
    }
    
    // User presence
    match /user_presence/{presenceId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Testing

After creating the indexes:
1. Wait 5-10 minutes for the indexes to build
2. Refresh your application
3. Try the collaboration features again

The indexes should resolve the query errors and enable full collaboration functionality.
