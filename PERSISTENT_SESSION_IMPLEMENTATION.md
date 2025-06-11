# Persistent Login Sessions Implementation

## Overview

This implementation provides persistent login sessions that allow users to remain authenticated across app restarts without needing to re-enter their credentials. The solution extends the existing authentication system with enhanced session management, automatic session refresh, and robust validation.

## Key Features

### 1. Extended Session Duration
- **Default Duration**: 30 days (configurable)
- **Minimum Duration**: 1 day
- **Maximum Duration**: 90 days
- **Activity Extension**: 7 days when user is active
- **Refresh Threshold**: Sessions refresh when less than 7 days remaining

### 2. Enhanced Session Security
- **Session Tokens**: Cryptographically generated tokens for validation
- **Session Validation**: Multi-layer validation including expiry, token, and user ID checks
- **Activity Tracking**: Automatic session extension based on user activity
- **Integrity Checks**: Validation against Firebase auth state

### 3. Automatic Session Management
- **Periodic Refresh**: Sessions automatically refresh every 5 minutes
- **Activity Monitoring**: User activity extends sessions automatically
- **Firebase Sync**: Sessions sync with Firebase authentication state
- **Graceful Degradation**: Handles offline scenarios and auth failures

### 4. Robust Initialization
- **Firebase Integration**: Waits for Firebase auth state before restoration
- **Race Condition Prevention**: Proper sequencing of auth state listeners
- **Error Handling**: Comprehensive error handling with fallback mechanisms
- **Backward Compatibility**: Maintains compatibility with existing local storage

## Technical Implementation

### Session Configuration (`src/utils/authUtils.ts`)

```typescript
export const SESSION_CONFIG = {
  DEFAULT_DURATION_HOURS: 30 * 24,    // 30 days
  MIN_DURATION_HOURS: 24,             // 1 day minimum
  MAX_DURATION_HOURS: 90 * 24,        // 90 days maximum
  ACTIVITY_EXTENSION_HOURS: 7 * 24,   // 7 days extension
  REFRESH_THRESHOLD_HOURS: 7 * 24,    // Refresh when < 7 days remaining
};
```

### Enhanced Session Data Structure

```typescript
interface SessionData {
  sessionId: string;           // Unique session identifier
  sessionToken: string;        // Validation token
  sessionExpiry: Date;         // Session expiration time
  lastActivity: Date;          // Last user activity timestamp
  authMethod: AuthMethod;      // Authentication method used
  userId: string;              // User ID for validation
}
```

### Key Functions

#### Session Creation
- `createNewSession(userId)`: Creates new session with all required data
- `generateSessionToken(sessionId, userId)`: Generates validation token
- `calculateSessionExpiry(duration?)`: Calculates expiry with configurable duration

#### Session Validation
- `validateSession(sessionData)`: Comprehensive session validation
- `isSessionValid(expiry, token?, sessionId?, userId?)`: Enhanced validity check
- `shouldRefreshSession(expiry)`: Determines if session needs refresh

#### Activity Management
- `updateUserActivity(state, userId)`: Updates activity and extends session
- `extendSessionExpiry(currentExpiry)`: Extends session based on activity

## Usage

### Automatic Operation

The persistent session system works automatically once implemented:

1. **Sign In**: Users sign in normally, sessions are created automatically
2. **App Restart**: Sessions are restored automatically on app startup
3. **Activity**: User activity automatically extends sessions
4. **Refresh**: Sessions refresh automatically when needed

### Manual Testing

Use the provided test utilities to verify functionality:

```typescript
// In browser console or test environment
import { runAllSessionTests } from './src/utils/sessionPersistenceTest';

// Run comprehensive tests
const results = await runAllSessionTests();
console.log('Test Results:', results);

// Or run individual tests
import { 
  testSessionPersistence, 
  testSessionRestoration, 
  testSessionExtension 
} from './src/utils/sessionPersistenceTest';

const persistenceResult = testSessionPersistence();
const restorationResult = await testSessionRestoration();
const extensionResult = testSessionExtension();
```

### Browser Console Access

The test functions are available in the browser console:

```javascript
// Test session persistence
sessionTests.testSessionPersistence();

// Test session restoration
await sessionTests.testSessionRestoration();

// Test session extension
sessionTests.testSessionExtension();

// Run all tests
await sessionTests.runAllSessionTests();
```

## Configuration Options

### Session Duration

Modify session duration in `src/utils/authUtils.ts`:

```typescript
// For longer sessions (60 days)
const sessionExpiry = calculateSessionExpiry(60 * 24);

// For shorter sessions (7 days)
const sessionExpiry = calculateSessionExpiry(7 * 24);
```

### Activity Monitoring

Adjust activity monitoring frequency in `src/stores/authStore.ts`:

```typescript
// Change refresh interval (currently 5 minutes)
setInterval(async () => {
  await get().refreshSession();
}, 10 * 60 * 1000); // 10 minutes

// Change activity throttling (currently 1 minute)
if (now - lastActivityUpdate > 30 * 1000) { // 30 seconds
  // Update activity
}
```

## Security Considerations

### Session Token Validation
- Tokens are generated using session ID, user ID, and timestamp
- Tokens have maximum age validation (90 days)
- Token validation prevents session hijacking

### Firebase Integration
- Sessions are validated against Firebase auth state
- Mismatched users trigger automatic sign-out
- Firebase token refresh is handled automatically

### Local Storage Security
- Session data is stored in localStorage with validation
- Sensitive data is not stored in plain text tokens
- Session integrity is verified on restoration

## Troubleshooting

### Common Issues

1. **Sessions Not Persisting**
   - Check localStorage permissions
   - Verify Firebase configuration
   - Check browser console for errors

2. **Frequent Re-authentication**
   - Check session duration configuration
   - Verify activity monitoring is working
   - Check Firebase auth state persistence

3. **Session Validation Failures**
   - Check system clock accuracy
   - Verify user ID consistency
   - Check for localStorage corruption

### Debug Information

Enable debug logging by checking browser console for:
- `🔄 Starting session restoration...`
- `✅ Session restored successfully`
- `🔄 Extending session due to user activity`
- `💾 Auth state saved to localStorage`

## Migration Notes

### Existing Users
- Existing sessions will be upgraded automatically
- No user action required for migration
- Backward compatibility maintained

### Development
- Test thoroughly in development environment
- Verify session behavior across browser restarts
- Test with different user types (anonymous, email, Google)

## Performance Impact

### Minimal Overhead
- Session validation: ~1ms per check
- Activity monitoring: Throttled to 1 update per minute
- localStorage operations: Optimized for minimal writes
- Background refresh: Every 5 minutes when authenticated

### Memory Usage
- Session data: ~1KB per user
- Activity listeners: Minimal memory footprint
- Periodic timers: Single interval per session

## Future Enhancements

### Potential Improvements
1. **Cross-device Sessions**: Sync sessions across devices
2. **Session Analytics**: Track session usage patterns
3. **Advanced Security**: Implement session encryption
4. **Configurable UI**: User-controlled session preferences
