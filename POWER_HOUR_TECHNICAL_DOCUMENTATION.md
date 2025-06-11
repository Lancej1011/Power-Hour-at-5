# Power Hour at 5 - Complete Technical Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Core Architecture](#core-architecture)
3. [Data Models & Types](#data-models--types)
4. [State Management](#state-management)
5. [Component Architecture](#component-architecture)
6. [Service Layer](#service-layer)
7. [Feature Specifications](#feature-specifications)
8. [Routing & Navigation](#routing--navigation)
9. [External Integrations](#external-integrations)
10. [Configuration & Environment](#configuration--environment)
11. [Build & Deployment](#build--deployment)

---

## 1. Application Overview

### Purpose
Power Hour at 5 is a comprehensive music mixing and playlist management application designed for creating "Power Hour" experiences - 60-minute sessions with 1-minute clips from different songs, typically used for drinking games or parties.

### Core Capabilities
- **Music Library Management**: Scan and manage multiple music libraries with metadata extraction
- **Mix Creation**: Extract 1-minute clips from songs and create seamless audio mixes
- **Playlist Management**: Create, edit, and manage both regular and YouTube-based playlists
- **YouTube Integration**: Search, browse, and create playlists using YouTube content via yt-dlp
- **Audio Visualization**: Real-time audio visualization with multiple visualizer types
- **Community Features**: Share playlists, rate content, and discover community-created playlists
- **Drinking Clips**: Overlay audio/video clips during playlist playback for enhanced party experience
- **User Authentication**: Firebase-based authentication with offline fallback
- **Cross-Platform**: Electron-based desktop application with web technologies

### Technology Stack
- **Frontend**: React 19, TypeScript, Material-UI v7
- **State Management**: Zustand with immer middleware
- **Audio Processing**: Howler.js, Web Audio API, music-metadata
- **Video Integration**: react-youtube, yt-dlp-wrap
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore with localStorage fallback
- **Desktop Framework**: Electron
- **Build Tool**: Vite
- **Styling**: Material-UI with custom theming system

---

## 2. Core Architecture

### Application Structure
```
src/
├── components/          # React components
├── contexts/           # React Context providers
├── stores/             # Zustand state stores
├── services/           # Business logic services
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── themes/             # Theme configuration
├── config/             # Application configuration
└── assets/             # Static assets
```

### Data Flow Architecture
1. **UI Layer**: React components with Material-UI
2. **State Layer**: Zustand stores for global state management
3. **Context Layer**: React contexts for cross-cutting concerns (Audio, Auth, Library, Theme, Visualizer)
4. **Service Layer**: Business logic and external API integration
5. **Persistence Layer**: Firebase Firestore + localStorage hybrid storage
6. **Native Layer**: Electron main process for file system operations

### Key Architectural Patterns
- **Hybrid State Management**: Zustand stores + React contexts for different concerns
- **Service-Oriented Architecture**: Dedicated services for auth, playlists, YouTube, etc.
- **Offline-First Design**: localStorage fallback for all Firebase operations
- **Component Composition**: Reusable components with clear separation of concerns
- **Hook-Based Logic**: Custom hooks for complex state logic and side effects

---

## 3. Data Models & Types

### Core Interfaces

#### Mix Interface
```typescript
interface Mix {
  id: string;
  name: string;
  date: string;
  songList: string[];
  filename: string;
  localFilePath?: string;
  artist?: string;
  year?: string;
  genre?: string;
}
```

#### Playlist Interface
```typescript
interface Playlist {
  id: string;
  name: string;
  date: string;
  clips: Array<{
    id: string;
    name: string;
    start: number;
    duration: number;
    songName?: string;
    clipPath?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
  }>;
  drinkingSoundPath?: string;
}
```

#### YouTube Playlist Interface
```typescript
interface YouTubePlaylist {
  id: string;
  name: string;
  clips: YouTubeClip[];
  drinkingSoundPath?: string;
  imagePath?: string;
  date: string;
  thumbnailType?: 'custom' | 'random';
  lastThumbnailUpdate?: string;
  isPublic?: boolean;
  shareCode?: string;
  creator?: string;
  description?: string;
  rating?: number;
  downloadCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}
```

#### YouTube Clip Interface
```typescript
interface YouTubeClip {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  startTime: number; // in seconds
  duration: number; // in seconds (typically 60 for power hour)
  thumbnail: string;
}
```

#### Library Song Interface
```typescript
interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  duration?: number;
  bpm?: number;
  albumArt?: string;
  fileSize?: number;
  lastModified?: number;
  tags?: string[];
  libraryPath?: string;
  libraryName?: string;
}
```

### Authentication Types

#### AuthUser Interface
```typescript
interface AuthUser extends Omit<FirebaseUser, 'metadata'> {
  profile?: UserProfile;
  preferences?: UserPreferences;
  lastSyncAt?: Date;
  isOnline?: boolean;
  emailVerificationStatus?: EmailVerificationStatus;
  accountLinkingAvailable?: boolean;
  securitySettings?: UserSecuritySettings;
}
```

#### UserProfile Interface
```typescript
interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  lastLoginAt: any; // Firestore timestamp
  isAnonymous: boolean;
  authMethod: AuthMethod;
  isAdmin?: boolean;
  adminPermissions?: {
    canManageCommunity: boolean;
    canManageUsers: boolean;
    canModerateContent: boolean;
    canAccessAnalytics: boolean;
  };
  stats?: {
    playlistsCreated: number;
    playlistsShared: number;
    totalLogins: number;
    lastActiveAt: any; // Firestore timestamp
  };
}
```

#### UserPreferences Interface
```typescript
interface UserPreferences {
  theme: {
    mode: 'light' | 'dark';
    colorTheme: string;
  };
  audio: {
    volume: number;
    defaultPlaybackSpeed: number;
    enableDrinkingClips: boolean;
  };
  ui: {
    showTooltips: boolean;
    enableAnimations: boolean;
    compactMode: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    publicProfile: boolean;
  };
  notifications: {
    enableToasts: boolean;
    playlistUpdates: boolean;
  };
  authentication: {
    rememberMe: boolean;
    autoSignIn: boolean;
    requireAuthForCommunity: boolean;
  };
}
```

### Shared Playlist Types

#### SharedPlaylist Interface
```typescript
interface SharedPlaylist {
  id: string;
  originalPlaylistId: string;
  name: string;
  description?: string;
  clips: YouTubeClip[];
  drinkingSoundPath?: string;
  imagePath?: string;
  shareCode: string;
  isPublic: boolean;
  creator: string;
  creatorId: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  rating: number;
  ratingCount: number;
  downloadCount: number;
  tags: string[];
  category?: string;
  version: number;
}
```

### YouTube Authentication Types

#### YouTubeAuthStore Interface
```typescript
interface YouTubeAuthStore {
  isAuthenticated: boolean;
  user: YouTubeUser | null;
  tokens: YouTubeOAuthTokens | null;
  method: YouTubeAuthMethod;
  apiKeys: YouTubeApiKey[];
  activeApiKeyId: string | null;
  lastError: string | null;
  
  // OAuth methods
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  
  // API key methods
  addApiKey: (key: string, name: string) => Promise<boolean>;
  removeApiKey: (keyId: string) => void;
  setActiveApiKey: (keyId: string) => void;
  getActiveApiKey: () => YouTubeApiKey | null;
  getNextAvailableKey: () => YouTubeApiKey | null;
  validateApiKey: (key: string) => Promise<boolean>;
  
  // Hybrid methods
  setAuthMethod: (method: YouTubeAuthMethod) => void;
  getCurrentAuthMethod: () => YouTubeAuthMethod;
  canMakeRequest: () => boolean;
  
  // Error handling
  handleAuthError: (error: any) => void;
  clearError: () => void;
  
  // Storage
  saveToStorage: () => void;
  loadFromStorage: () => void;
}
```

---

## 4. State Management

### Zustand Stores

#### AuthStore (`src/stores/authStore.ts`)
**Purpose**: Manages user authentication state, session management, and user data synchronization.

**State Structure**:
```typescript
interface AuthStoreState {
  // Core authentication state
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  user: AuthUser | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;

  // Authentication methods and capabilities
  authMethod: 'google' | 'email' | 'anonymous' | 'none';
  isFirebaseAvailable: boolean;
  canSignIn: boolean;

  // Session management
  sessionId: string | null;
  lastActivity: Date | null;
  sessionExpiry: Date | null;

  // Loading and error states
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  isSyncing: boolean;
  lastError: AuthError | null;

  // Sync and offline state
  isOnline: boolean;
  lastSyncAt: Date | null;
  pendingSyncData: any[];

  // Local storage fallback
  localStorageEnabled: boolean;
  localUserData: any | null;
}
```

**Key Actions**:
- `signInWithGoogle()`: Google OAuth authentication
- `signInWithEmail(email, password)`: Email/password authentication
- `signInAnonymously()`: Anonymous authentication
- `signOut()`: Sign out and clear session
- `updateProfile(updates)`: Update user profile
- `updatePreferences(updates)`: Update user preferences
- `syncUserData()`: Sync data with Firebase
- `clearError()`: Clear authentication errors

#### PlaylistStore (`src/stores/playlistStore.ts`)
**Purpose**: Manages both regular and YouTube playlists with authentication integration and sync capabilities.

**State Structure**:
```typescript
interface PlaylistStoreState {
  // Playlist data
  regularPlaylists: RegularPlaylist[];
  youtubePlaylists: YouTubePlaylist[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingRegular: boolean;
  isLoadingYouTube: boolean;

  // Sync status
  syncStatus: Record<string, PlaylistSyncStatus>;
  lastSyncAt: string | null;
  pendingSyncCount: number;

  // Error handling
  lastError: string | null;

  // Authentication awareness
  isAuthenticated: boolean;
  currentUserId: string | null;
}
```

**Key Actions**:
- `loadRegularPlaylists()`: Load regular playlists from storage
- `loadYouTubePlaylists()`: Load YouTube playlists from storage
- `saveRegularPlaylist(playlist)`: Save regular playlist
- `saveYouTubePlaylist(playlist)`: Save YouTube playlist
- `deleteRegularPlaylist(id)`: Delete regular playlist
- `deleteYouTubePlaylist(id)`: Delete YouTube playlist
- `syncAllPlaylists()`: Sync all playlists with Firebase
- `syncPlaylist(id, type)`: Sync specific playlist

#### YouTubeAuthStore (`src/stores/youtubeAuthStore.ts`)
**Purpose**: Manages YouTube-specific authentication including OAuth 2.0 and API key management.

**State Structure**:
```typescript
interface YouTubeAuthStoreState {
  isAuthenticated: boolean;
  user: YouTubeUser | null;
  tokens: YouTubeOAuthTokens | null;
  method: 'oauth' | 'apikey' | 'hybrid';
  apiKeys: YouTubeApiKey[];
  activeApiKeyId: string | null;
  lastError: string | null;
}
```

**Key Actions**:
- `signInWithGoogle()`: OAuth authentication
- `addApiKey(key, name)`: Add API key
- `setActiveApiKey(id)`: Set active API key
- `validateApiKey(key)`: Validate API key
- `setAuthMethod(method)`: Set authentication method

### React Contexts

#### AudioContext (`src/contexts/AudioContext.tsx`)
**Purpose**: Manages all audio playback state including mixes, playlists, and preview clips.

**State Structure**:
```typescript
interface AudioContextState {
  // Current audio source
  audioSource: 'mix' | 'playlist' | 'preview' | null;

  // Mix playback state
  currentMix: Mix | null;
  mixAudio: HTMLAudioElement | null;
  mixPlaying: boolean;
  mixCurrentTime: number;
  mixDuration: number;
  mixVolume: number;
  mixMuted: boolean;
  mixArtist: string | null;
  mixYear: string | null;
  mixGenre: string | null;

  // Playlist playback state
  currentPlaylist: Playlist | null;
  playlistSound: Howl | null;
  playlistPlaying: boolean;
  currentClipIndex: number;
  playlistProgress: number;
  playlistDuration: number;
  playlistVolume: number;
  playlistMuted: boolean;
  isDrinkingSoundPlaying: boolean;

  // Preview playback state
  previewSound: Howl | null;
  previewPlaying: boolean;
  previewCurrentTime: number;
  previewDuration: number;
  previewClipName: string | null;
  previewClipIndex: number;
  previewClipsTotal: number;
  previewPlaylistName: string | null;
  previewClipArtist: string | null;
  previewVolume: number;
  previewMuted: boolean;
}
```

**Key Actions**:
- `playMix(mix)`: Play audio mix
- `playPlaylist(playlist)`: Play playlist with clips
- `playPreview(clips, index)`: Play preview of clips
- `pauseMix()`, `resumeMix()`, `stopMix()`: Mix controls
- `pausePlaylist()`, `resumePlaylist()`, `stopPlaylist()`: Playlist controls
- `nextClip()`, `previousClip()`: Playlist navigation
- `seekMix(time)`, `seekPlaylist(time)`: Seek controls
- `setMixVolume(volume)`, `setPlaylistVolume(volume)`: Volume controls

#### AuthContext (`src/contexts/AuthContext.tsx`)
**Purpose**: Provides React context wrapper around AuthStore with additional React-specific functionality.

**Key Features**:
- Wraps AuthStore state and actions
- Provides authentication event listeners
- Handles component lifecycle integration
- Manages authentication initialization

#### LibraryContext (`src/contexts/LibraryContext.tsx`)
**Purpose**: Manages music library state including multiple library support and metadata.

**State Structure**:
```typescript
interface LibraryContextState {
  // Library state
  libraryFolder: string | null;
  librarySongs: LibrarySong[];
  libraryLoading: boolean;
  libraryError: string | null;
  libraryProgress: LibraryProgress | null;
  allLibraries: LibraryCache[];

  // Library playback state
  libraryPlayingIndex: number | null;

  // Library sort and search
  librarySort: { field: string; direction: 'asc' | 'desc' };
  librarySearch: string;

  // Selected songs
  selectedSongs: Set<string>;

  // Recently played
  recentlyPlayed: LibrarySong[];

  // Favorite tracks
  favoriteTracks: Set<string>;
}
```

**Key Actions**:
- `loadLibrarySongs(forceRefresh)`: Load songs from library
- `setLibraryFolder(folder)`: Set active library folder
- `selectLibrary(libraryId)`: Switch to different library
- `addLibraryFolder()`: Add new library folder
- `refreshLibrary(libraryId)`: Refresh specific library
- `removeLibrary(libraryId)`: Remove library
- `addToRecentlyPlayed(song)`: Track recently played songs
- `toggleFavorite(songPath)`: Toggle favorite status

#### ThemeContext (`src/contexts/ThemeContext.tsx`)
**Purpose**: Manages application theming including color themes and light/dark mode.

**State Structure**:
```typescript
interface ThemeContextState {
  currentTheme: ColorTheme;
  mode: 'light' | 'dark';
  availableThemes: ColorTheme[];
}
```

**Key Actions**:
- `setTheme(themeId)`: Change color theme
- `toggleMode()`: Toggle light/dark mode
- `saveCustomTheme(theme)`: Save custom theme
- `deleteCustomTheme(themeId)`: Delete custom theme

#### VisualizerContext (`src/contexts/VisualizerContext.tsx`)
**Purpose**: Manages audio visualizer settings and configuration.

**State Structure**:
```typescript
interface VisualizerContextState {
  settings: VisualizerSettings;
}

interface VisualizerSettings {
  type: 'bars' | 'circular' | 'waveform' | 'particles' | 'spectrum' | 'mandala' | 'liquid' | 'galaxy';
  showSongInfo: boolean;
  showAnalysis: boolean;
  fullScreen: boolean;
  triviaMode: boolean;
  sensitivity: number;
  colorMode: 'theme' | 'rainbow' | 'custom' | 'gradient' | 'reactive' | 'frequency';
  customColor: string;
  barCount: number;
  smoothing: number;
  particleCount: number;
  backgroundOpacity: number;
  bloomIntensity: number;
  motionBlur: boolean;
  beatReactive: boolean;
  glowEffect: boolean;
  gradientColors: string[];
  colorCycleSpeed: number;
  frequencyColorMapping: boolean;
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
  showAlbumArt: boolean;
  albumArtSize: 'small' | 'medium' | 'large';
  albumArtPosition: 'center' | 'corner' | 'side';
  albumArtOpacity: number;
  enableOnlineAlbumArt: boolean;
}
```

**Key Actions**:
- `updateSettings(newSettings)`: Update visualizer settings
- `resetSettings()`: Reset to default settings

---

## 5. Component Architecture

### Main Application Components

#### App (`src/App.tsx`)
**Purpose**: Root application component that orchestrates all major features and routing.

**Key Responsibilities**:
- Provides context providers (Auth, Audio, Library, Theme, Visualizer)
- Manages global navigation and routing
- Handles unified media bar state
- Coordinates audio playback across different sources
- Manages window controls for Electron

**Key Features**:
- Hash-based routing for Electron compatibility
- Conditional layout for visualizer (full-screen) vs other pages (scrollable)
- Global snackbar notifications
- Authentication-aware navigation
- Unified media player bar that adapts to current audio source

#### SongUploader (`src/components/SongUploader.tsx`)
**Purpose**: Main library management and mix creation interface.

**Key Responsibilities**:
- Display and manage music library with virtualized table
- Extract clips from songs with waveform preview
- Create and edit audio mixes
- Handle multiple library management
- Provide song search and filtering

**Key Features**:
- Virtualized library table for performance with large libraries
- Waveform visualization for clip extraction
- Drag-and-drop clip reordering
- Real-time audio preview during clip extraction
- Multiple library support with switching
- Advanced filtering and search capabilities
- Metadata editing and enhancement

#### Playlists (`src/components/Playlists.tsx`)
**Purpose**: Playlist management interface for both regular and YouTube playlists.

**Key Responsibilities**:
- Display unified view of all playlist types
- Create, edit, and delete playlists
- Manage playlist sharing and import/export
- Handle drinking sound assignment
- Provide playlist playback controls

**Key Features**:
- Unified playlist cards for regular and YouTube playlists
- Playlist sharing with community integration
- Import/export functionality with share codes
- Drinking sound management per playlist
- Playlist image/thumbnail management
- Drag-and-drop clip reordering within playlists

#### YouTube Components

##### YouTube (`src/components/YouTube.tsx`)
**Purpose**: Legacy YouTube search and playlist creation interface.

##### YouTubeV2 (`src/components/YouTubeV2.tsx`)
**Purpose**: Modern YouTube search and playlist creation interface.

**Key Responsibilities**:
- YouTube video search with yt-dlp integration
- Channel browsing and video discovery
- Playlist creation from YouTube content
- Video preview and clip time setting

**Key Features**:
- Advanced search with filters and pagination
- Channel search and video browsing
- Video preview with time range selection
- Bulk playlist creation from search results
- Integration with YouTube authentication system

##### YouTubePlaylistPlayer (`src/components/YouTubePlaylistPlayer.tsx`)
**Purpose**: Dedicated YouTube playlist playback interface.

**Key Responsibilities**:
- Play YouTube playlists with seamless transitions
- Handle drinking sound overlays during playback
- Manage fullscreen video playback
- Provide playlist navigation controls

**Key Features**:
- Seamless video transitions between clips
- Drinking sound integration with volume ducking
- Fullscreen video support
- Playlist progress tracking
- Automatic clip advancement

#### MusicVisualizer (`src/components/MusicVisualizer.tsx`)
**Purpose**: Real-time audio visualization with multiple visualizer types.

**Key Responsibilities**:
- Real-time audio analysis and visualization
- Multiple visualizer types (bars, circular, waveform, particles, etc.)
- Audio-reactive visual effects
- Album art integration

**Key Features**:
- 8 different visualizer types
- Real-time audio frequency analysis
- Customizable visual effects and colors
- Album art display with online fetching
- Trivia mode for song information reveal
- Performance optimization with requestAnimationFrame

#### Settings (`src/components/Settings.tsx`)
**Purpose**: Application settings and preferences management.

**Key Responsibilities**:
- Theme selection and customization
- Audio preferences configuration
- Library settings management
- User account management
- Keyboard shortcuts help

**Key Features**:
- Theme editor with custom color creation
- Audio volume and playback preferences
- Library scanning and metadata settings
- User authentication and profile management
- Keyboard shortcuts reference

#### SharedPlaylists (`src/components/SharedPlaylists.tsx`)
**Purpose**: Community playlist discovery and management interface.

**Key Responsibilities**:
- Browse community-shared playlists
- Import playlists from share codes
- Rate and review community content
- Manage user's shared playlists

**Key Features**:
- Playlist discovery with categories and sorting
- Rating and review system
- Share code import/export
- Community playlist cards with metadata
- User-specific playlist management

### Utility Components

#### UnifiedMediaBar (`src/components/UnifiedMediaBar.tsx`)
**Purpose**: Global media player that adapts to different audio sources.

**Key Features**:
- Adapts UI based on current audio source (mix, playlist, preview)
- Volume control with persistence
- Playback controls (play/pause, seek, stop)
- Track information display
- Jump to currently playing song functionality

#### WindowControls (`src/components/WindowControls.tsx`)
**Purpose**: Custom window controls for frameless Electron window.

**Key Features**:
- Minimize, maximize, close buttons
- Custom styling to match application theme
- Electron IPC integration for window management

#### ModernNavigation (`src/components/ModernNavigation.tsx`)
**Purpose**: Main application navigation with authentication awareness.

**Key Features**:
- Tab-based navigation with icons
- Authentication-aware tab visibility
- Tooltip support for tab descriptions
- Responsive design for different screen sizes

#### ErrorBoundary (`src/components/ErrorBoundary.tsx`)
**Purpose**: React error boundary for graceful error handling.

**Key Features**:
- Catches and displays React component errors
- Provides error reporting and recovery options
- Maintains application stability during errors

---

## 6. Service Layer

### Authentication Services

#### authService (`src/services/authService.ts`)
**Purpose**: Core Firebase authentication service with comprehensive auth method support.

**Key Methods**:
- `signInWithGoogle()`: Google OAuth authentication
- `signInWithEmail(email, password)`: Email/password authentication
- `signInAnonymously()`: Anonymous authentication
- `createUserWithEmailAndPassword(email, password, displayName)`: User registration
- `signOut()`: Sign out and cleanup
- `sendPasswordResetEmail(email)`: Password reset functionality
- `sendEmailVerification()`: Email verification
- `updatePassword(currentPassword, newPassword)`: Password updates
- `linkAnonymousToEmail(email, password)`: Account linking
- `getCurrentUser()`: Get current authenticated user
- `isAuthenticated()`: Check authentication status
- `createOrUpdateUserProfile(user, isAnonymous)`: Profile management
- `onAuthStateChanged(callback)`: Authentication state listener

**Key Features**:
- Comprehensive error handling with user-friendly messages
- Automatic profile creation and updates
- Session management and persistence
- Email verification workflow
- Account linking capabilities
- Admin user detection and permissions

#### userDataService (`src/services/userDataService.ts`)
**Purpose**: User data synchronization between Firebase and localStorage.

**Key Methods**:
- `syncUserData()`: Full user data synchronization
- `saveUserProfile(profile)`: Save profile to Firestore
- `loadUserProfile()`: Load profile from Firestore
- `saveUserPreferences(preferences)`: Save preferences to Firestore
- `loadUserPreferences()`: Load preferences from Firestore
- `getSyncStatus()`: Get current sync status
- `clearUserData()`: Clear all user data

**Key Features**:
- Hybrid storage approach (Firebase + localStorage)
- Conflict resolution for data synchronization
- Offline-first design with automatic sync when online
- Data migration between anonymous and authenticated accounts

### Playlist Services

#### playlistDataService (`src/services/playlistDataService.ts`)
**Purpose**: Playlist data management with Firebase integration.

**Key Methods**:
- `getRegularPlaylists()`: Load regular playlists
- `getYouTubePlaylists()`: Load YouTube playlists
- `saveRegularPlaylist(playlist)`: Save regular playlist
- `saveYouTubePlaylist(playlist)`: Save YouTube playlist
- `deleteRegularPlaylist(id)`: Delete regular playlist
- `deleteYouTubePlaylist(id)`: Delete YouTube playlist
- `syncAllPlaylists()`: Sync all playlists with Firebase
- `syncRegularPlaylists()`: Sync regular playlists
- `syncYouTubePlaylists()`: Sync YouTube playlists

**Key Features**:
- User-scoped playlist storage
- Automatic sync with authentication state changes
- Conflict resolution for playlist updates
- Performance optimization with efficient queries

#### firebasePlaylistService (`src/services/firebasePlaylistService.ts`)
**Purpose**: Community playlist sharing and discovery.

**Key Methods**:
- `sharePlaylist(playlist)`: Share playlist to community
- `getPlaylistByCode(shareCode)`: Get playlist by share code
- `getCommunityPlaylists(category, sortBy, limit)`: Browse community playlists
- `importPlaylistByCode(shareCode)`: Import playlist from share code
- `recordDownload(playlistId)`: Track playlist downloads
- `ratePlaylist(playlistId, rating, review)`: Rate community playlist
- `updatePlaylist(playlistId, updates)`: Update shared playlist
- `deletePlaylist(playlistId)`: Delete shared playlist

**Key Features**:
- Public/private playlist sharing
- Community discovery with categories and sorting
- Rating and review system
- Download tracking and analytics
- Share code generation and validation

### YouTube Services

#### ytDlpService (`src/services/ytDlpService.ts`)
**Purpose**: YouTube content integration via yt-dlp.

**Key Methods**:
- `searchYouTubeWithYtDlp(query, maxResults)`: Search YouTube videos
- `getVideoDetailsWithYtDlp(videoId)`: Get video metadata
- `searchChannelsWithYtDlp(query, maxResults)`: Search YouTube channels
- `getChannelVideosWithYtDlp(channelId, maxResults)`: Get channel videos

**Key Features**:
- Electron IPC integration for yt-dlp execution
- Video metadata extraction
- Channel browsing and discovery
- Error handling and fallback mechanisms
- Result formatting and normalization

#### googleAuthService (`src/services/googleAuthService.ts`)
**Purpose**: Google OAuth for YouTube API access.

**Key Methods**:
- `signIn()`: Google OAuth sign-in
- `signOut()`: Google OAuth sign-out
- `refreshTokens()`: Refresh OAuth tokens
- `getStoredUser()`: Get stored user data
- `isAuthenticated()`: Check OAuth status

**Key Features**:
- OAuth 2.0 flow implementation
- Token management and refresh
- Scope-based permissions
- Secure token storage

### Administrative Services

#### adminService (`src/services/adminService.ts`)
**Purpose**: Administrative functions for community management.

**Key Methods**:
- `getAllCommunityPlaylists()`: Get all playlists (admin only)
- `deletePlaylist(playlistId)`: Delete any playlist (admin only)
- `updatePlaylist(playlistId, updates)`: Update any playlist (admin only)
- `getCommunityStats()`: Get community statistics
- `clearCommunityContent()`: Clear all community content (admin only)

**Key Features**:
- Admin permission verification
- Comprehensive community management
- Bulk operations for content moderation
- Analytics and reporting capabilities

---

## 7. Feature Specifications

### Music Library Management

#### Multiple Library Support
**Functionality**: Users can add and manage multiple music library folders simultaneously.

**Implementation Details**:
- Library persistence using `LibraryPersistenceManager` singleton
- Each library has unique ID based on folder path hash
- Libraries cached with metadata including song count, total size, last scan time
- Active library switching with independent state management
- Recursive folder scanning for all subdirectories

**User Workflows**:
1. Add Library: Select folder → Scan for audio files → Extract metadata → Cache results
2. Switch Library: Select from library list → Load cached songs → Update UI
3. Refresh Library: Re-scan folder → Update metadata → Merge with existing cache
4. Remove Library: Delete from cache → Clear current library if active

**Data Persistence**:
- localStorage for library cache and settings
- Metadata cache with expiry (24 hours)
- Library settings (scan depth, file types, etc.)

#### Metadata Extraction and Management
**Functionality**: Automatic metadata extraction from audio files with manual editing capabilities.

**Implementation Details**:
- `music-metadata` library for metadata parsing
- Supported formats: MP3, WAV, OGG, M4A, FLAC, AAC
- Cached metadata to avoid re-parsing
- Manual metadata editing with persistence

**Extracted Metadata**:
- Title, Artist, Album, Genre, Year
- Duration, File size, Last modified
- Album art extraction and caching
- BPM detection (future enhancement)

#### Library Search and Filtering
**Functionality**: Advanced search and filtering capabilities across library content.

**Implementation Details**:
- Real-time search across all metadata fields
- Quick filters for favorites, recently played, specific genres
- Advanced filtering with multiple criteria
- Sort by any metadata field (ascending/descending)

**Search Features**:
- Text search across title, artist, album, genre
- Tag-based filtering
- Date range filtering
- File size and duration filtering

### Mix Creation and Audio Processing

#### Clip Extraction
**Functionality**: Extract precise audio clips from songs with visual waveform guidance.

**Implementation Details**:
- Web Audio API for waveform visualization
- `audiobuffer-to-wav` for audio processing
- Real-time preview during clip selection
- Precise time selection with millisecond accuracy

**User Workflow**:
1. Select song from library
2. View waveform visualization
3. Set start time and duration (default 60 seconds)
4. Preview clip with real-time playback
5. Add to mix or save as individual clip

#### Mix Generation
**Functionality**: Create seamless audio mixes from extracted clips.

**Implementation Details**:
- Automatic crossfading between clips
- Volume normalization across clips
- Gap insertion for drinking time
- Export as single WAV file

**Mix Features**:
- Customizable clip order with drag-and-drop
- Individual clip volume adjustment
- Crossfade duration settings
- Mix metadata (name, date, song list)

### Playlist Management

#### Unified Playlist System
**Functionality**: Manage both regular (audio file) and YouTube playlists in unified interface.

**Implementation Details**:
- Common playlist interface with type discrimination
- Unified playlist cards with type-specific features
- Shared operations (play, edit, delete, share)
- Type-specific operations (YouTube video management, audio clip management)

#### Playlist Sharing and Community
**Functionality**: Share playlists with community and discover others' creations.

**Implementation Details**:
- Share code generation for playlist identification
- Public/private playlist visibility settings
- Community discovery with categories and sorting
- Rating and review system for community playlists

**Sharing Workflow**:
1. Create/edit playlist
2. Set sharing preferences (public/private, description, tags)
3. Generate share code
4. Share code with others or publish to community
5. Others import using share code

**Community Features**:
- Browse by category (Party, Workout, Chill, etc.)
- Sort by rating, downloads, date created
- Search community playlists
- Rate and review imported playlists

### YouTube Integration

#### Video Search and Discovery
**Functionality**: Search YouTube content and browse channels using yt-dlp.

**Implementation Details**:
- yt-dlp integration via Electron IPC
- Video search with metadata extraction
- Channel browsing and video discovery
- Pagination for large result sets

**Search Features**:
- Video search with configurable result count
- Channel search with subscriber information
- Video metadata (title, duration, thumbnail, description)
- Channel video browsing with sorting options

#### YouTube Playlist Creation
**Functionality**: Create playlists from YouTube videos with precise time controls.

**Implementation Details**:
- Video preview with time range selection
- Bulk playlist creation from search results
- Individual clip time customization
- Thumbnail management for playlists

**Playlist Features**:
- Drag-and-drop clip reordering
- Individual clip start time and duration
- Playlist thumbnail (custom or random from clips)
- Drinking sound integration

#### YouTube Authentication
**Functionality**: Hybrid authentication supporting both OAuth and API keys.

**Implementation Details**:
- Google OAuth 2.0 for full API access
- API key management for quota distribution
- Automatic fallback between authentication methods
- Quota tracking and key rotation

**Authentication Methods**:
- OAuth: Full API access with user consent
- API Key: Limited access with quota management
- Hybrid: Automatic switching based on availability

### Audio Visualization

#### Multiple Visualizer Types
**Functionality**: Real-time audio visualization with 8 different visualizer types.

**Implementation Details**:
- Web Audio API for frequency analysis
- Canvas-based rendering with requestAnimationFrame
- Customizable visual effects and colors
- Performance optimization for smooth 60fps rendering

**Visualizer Types**:
1. **Bars**: Classic frequency bars with customizable count
2. **Circular**: Circular frequency display with rotation
3. **Waveform**: Time-domain waveform visualization
4. **Particles**: Audio-reactive particle system
5. **Spectrum**: Detailed frequency spectrum analysis
6. **Mandala**: Geometric patterns reactive to audio
7. **Liquid**: Fluid-like visualization with audio response
8. **Galaxy**: Space-themed visualization with stars and effects

**Customization Options**:
- Color modes (theme, rainbow, custom, gradient, reactive, frequency)
- Visual effects (bloom, motion blur, glow)
- Performance settings (render quality, particle count)
- Album art integration with opacity and positioning

### Drinking Clips System

#### Audio/Video Overlay Clips
**Functionality**: Overlay short audio or video clips during playlist playback for enhanced party experience.

**Implementation Details**:
- Support for both audio files and YouTube videos
- Volume ducking of main audio during clip playback
- Preloading of clips for seamless playback
- Integration with playlist progression

**Clip Types**:
- **Audio Clips**: Local audio files (MP3, WAV, etc.)
- **YouTube Clips**: YouTube videos with custom duration
- **Manual Triggers**: User-activated clips
- **Automatic Triggers**: Time-based or event-based activation

**Playback Features**:
- Volume ducking (main audio to 15% during clip)
- Seamless integration with playlist flow
- Visual notifications with animated effects
- Clip library management and organization

### User Authentication and Data Sync

#### Multi-Method Authentication
**Functionality**: Support multiple authentication methods with seamless account linking.

**Implementation Details**:
- Google OAuth for social login
- Email/password for traditional accounts
- Anonymous accounts for guest usage
- Account linking to upgrade anonymous to full accounts

**Authentication Features**:
- Session persistence across app restarts
- Automatic token refresh
- Offline fallback with localStorage
- Cross-device data synchronization

#### Data Synchronization
**Functionality**: Sync user data across devices with offline support.

**Implementation Details**:
- Firebase Firestore for cloud storage
- localStorage for offline fallback
- Conflict resolution for simultaneous edits
- Incremental sync for performance

**Synchronized Data**:
- User profile and preferences
- Playlists (regular and YouTube)
- Library settings and favorites
- Recently played tracks
- Custom themes and settings

---

## 8. Routing & Navigation

### Route Structure
**Implementation**: React Router with HashRouter for Electron compatibility.

**Routes**:
```typescript
const routes = [
  { path: '/', component: SongUploader, label: 'Create Mix' },
  { path: '/playlists', component: Playlists, label: 'Playlists' },
  { path: '/youtube', component: YouTube, label: 'YouTube (Legacy)' },
  { path: '/youtube-v2', component: YouTubeV2, label: 'YouTube' },
  { path: '/community', component: SharedPlaylists, label: 'Community', requiresAuth: true },
  { path: '/visualizer', component: MusicVisualizer, label: 'Visualizer' },
  { path: '/youtube-player/:playlistId', component: YouTubePlaylistPlayer, dynamic: true }
];
```

### Navigation System
**Implementation**: Tab-based navigation with authentication awareness.

**Navigation Features**:
- Authentication-aware tab visibility
- Dynamic tab enabling/disabling based on user state
- Tooltip support for tab descriptions
- Icon-based navigation with labels
- Responsive design for different screen sizes

**Authentication-Aware Navigation**:
- Community tab only visible to authenticated users
- Guest users redirected from protected routes
- Automatic navigation updates on auth state changes

### Layout Management
**Implementation**: Conditional layout based on current route.

**Layout Types**:
1. **Standard Layout**: Header + scrollable content + media bar
   - Used for: Create Mix, Playlists, YouTube, Community
   - Features: Navigation tabs, scrollable content area, unified media bar

2. **Fullscreen Layout**: Full viewport without chrome
   - Used for: Visualizer, YouTube Player
   - Features: No navigation, no media bar, full audio/video focus

### Deep Linking and State Management
**Implementation**: URL-based state management for shareable links.

**Deep Link Features**:
- YouTube playlist player with clip index: `/youtube-player/:playlistId?clip=:index`
- Playlist sharing with automatic import
- State restoration from URL parameters
- Browser back/forward navigation support

---

## 9. External Integrations

### Firebase Integration

#### Authentication
**Service**: Firebase Auth
**Configuration**: Environment-based with fallback to localStorage
**Features**:
- Google OAuth provider
- Email/password authentication
- Anonymous authentication
- Custom claims for admin users

#### Database
**Service**: Firebase Firestore
**Collections**:
```typescript
// User profiles
users/{userId} = UserProfile

// User playlists (regular)
user_playlists/{playlistId} = {
  ...RegularPlaylist,
  userId: string,
  lastSyncAt: Timestamp
}

// User YouTube playlists
user_youtube_playlists/{playlistId} = {
  ...YouTubePlaylist,
  userId: string,
  lastSyncAt: Timestamp
}

// Shared community playlists
shared_playlists/{playlistId} = SharedPlaylist

// Playlist ratings
playlist_ratings/{ratingId} = {
  playlistId: string,
  userId: string,
  rating: number,
  review?: string,
  createdAt: Timestamp
}
```

**Security Rules**:
- User-scoped data access
- Admin-only community management
- Public read for community playlists
- Authenticated write for user data

### YouTube Integration

#### yt-dlp Integration
**Implementation**: Electron main process execution with IPC communication
**Features**:
- Video search and metadata extraction
- Channel browsing and discovery
- Video information retrieval
- Error handling and fallback mechanisms

**IPC Methods**:
```typescript
// Electron main process handlers
ipcMain.handle('yt-dlp-search', async (event, query, maxResults) => {
  // Execute yt-dlp search command
  // Parse and format results
  // Return structured data
});

ipcMain.handle('yt-dlp-get-video-details', async (event, videoId) => {
  // Get detailed video information
  // Extract metadata and thumbnails
  // Return video details
});
```

#### Google APIs (Optional)
**Service**: YouTube Data API v3
**Authentication**: OAuth 2.0 with API key fallback
**Features**:
- Enhanced video metadata
- Channel information and statistics
- Playlist management (future enhancement)
- Quota management and key rotation

### Audio Processing Libraries

#### Howler.js
**Purpose**: Cross-platform audio playback
**Features**:
- Multiple audio format support
- Volume control and fading
- Playback position control
- Audio sprite support for clips

#### Web Audio API
**Purpose**: Real-time audio analysis and processing
**Features**:
- Frequency domain analysis for visualizers
- Audio buffer processing for waveforms
- Real-time effects processing
- Audio context management

#### music-metadata
**Purpose**: Audio file metadata extraction
**Features**:
- Support for all major audio formats
- Album art extraction
- Comprehensive metadata parsing
- Performance optimization with caching

### File System Integration

#### Electron File Operations
**Implementation**: Main process file system access with IPC
**Features**:
- Music library scanning and indexing
- Audio file metadata extraction
- Mix and playlist file management
- Temporary file handling for clips

**File Operations**:
```typescript
// Library scanning
ipcMain.handle('list-library-audio', async (event, folderPath) => {
  // Recursively scan folder for audio files
  // Extract metadata for each file
  // Return structured library data
});

// Mix management
ipcMain.handle('save-mix', async (event, mix, audioBuffer) => {
  // Save mix metadata as JSON
  // Save audio data as WAV file
  // Return success status
});
```

---

## 10. Configuration & Environment

### Environment Variables
**File**: `.env` (not included in repository)

**Required Variables**:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

# YouTube API (Optional)
VITE_YOUTUBE_API_KEY=your_youtube_api_key
```

### Build Configuration

#### Vite Configuration (`vite.config.ts`)
**Features**:
- React plugin with fast refresh
- Code splitting for optimal loading
- Terser minification for production
- Source map generation (configurable)
- Development server with hot reload

**Optimization**:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', '@mui/material'],
        audio: ['howler', 'music-metadata-browser'],
        ui: ['@hello-pangea/dnd', 'react-window']
      }
    }
  }
}
```

#### Electron Configuration (`main.cjs`)
**Features**:
- Frameless window with custom controls
- IPC handler registration
- File system access and security
- Development vs production mode handling

**Security**:
- Context isolation enabled
- Node integration disabled in renderer
- Preload script for secure IPC communication
- CSP headers for web security

#### TypeScript Configuration (`tsconfig.json`)
**Features**:
- Strict type checking
- Modern ES target (ES2020)
- React JSX support
- Path mapping for clean imports
- Declaration generation for libraries

### Package Dependencies

#### Core Dependencies
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "@mui/material": "^7.0.2",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.0",
  "zustand": "^5.0.5",
  "immer": "^10.1.1",
  "react-router-dom": "^7.5.3"
}
```

#### Audio Processing
```json
{
  "howler": "^2.2.4",
  "music-metadata-browser": "^2.5.11",
  "audiobuffer-to-wav": "^1.0.0",
  "web-audio-api": "^0.2.2",
  "wavefile": "^11.0.0"
}
```

#### YouTube Integration
```json
{
  "react-youtube": "^10.1.0",
  "yt-dlp-wrap": "^2.3.12",
  "googleapis": "^144.0.0",
  "google-auth-library": "^9.14.1"
}
```

#### Firebase
```json
{
  "firebase": "^11.9.0"
}
```

#### Electron
```json
{
  "electron": "^36.1.0",
  "electron-builder": "^24.13.3"
}
```

#### UI Components
```json
{
  "@mui/icons-material": "^7.0.2",
  "@hello-pangea/dnd": "^18.0.1",
  "react-window": "^1.8.11",
  "react-dropzone": "^14.3.8",
  "react-color": "^2.19.3",
  "re-resizable": "^6.11.2"
}
```

---

## 11. Build & Deployment

### Development Setup
**Requirements**:
- Node.js 18+ with npm
- Python 3.7+ (for yt-dlp)
- Git for version control

**Setup Commands**:
```bash
# Clone repository
git clone <repository-url>
cd power-hour-at-5

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase and API credentials

# Start development server
npm run start
```

### Build Process

#### Development Build
```bash
# Start Vite dev server and Electron
npm run start

# Or run separately
npm run dev          # Vite dev server only
npm run dev:electron # Electron in development mode
```

#### Production Build
```bash
# Build for production
npm run build:prod

# Build Electron distributables
npm run electron:build

# Build without publishing
npm run electron:dist

# Build directory only (for testing)
npm run electron:pack
```

### Electron Builder Configuration (`electron-builder.json`)
**Features**:
- Multi-platform builds (Windows, macOS, Linux)
- Code signing for security
- Auto-updater integration
- Installer generation
- File associations for playlist files

**Build Targets**:
- Windows: NSIS installer, portable executable
- macOS: DMG, ZIP archive
- Linux: AppImage, DEB, RPM packages

### Deployment Strategies

#### Desktop Application
- Electron Builder for cross-platform packaging
- GitHub Releases for distribution
- Auto-updater for seamless updates
- Code signing for security and trust

#### Web Application (Future)
- Vite build for static hosting
- Firebase Hosting for deployment
- PWA capabilities for offline usage
- Service worker for caching

### Performance Optimization

#### Bundle Optimization
- Code splitting by feature and vendor
- Tree shaking for unused code elimination
- Minification with Terser
- Gzip compression for assets

#### Runtime Optimization
- Virtualized lists for large datasets
- Lazy loading for components
- Memoization for expensive calculations
- Web Workers for background processing

#### Memory Management
- Audio buffer cleanup after playback
- Component unmounting cleanup
- Event listener removal
- Cache size limits with LRU eviction

---

## Summary

This technical documentation provides a comprehensive blueprint for recreating the Power Hour at 5 application with identical functionality. The application demonstrates sophisticated state management, real-time audio processing, cross-platform compatibility, and modern web development practices.

**Key Technical Achievements**:
- Hybrid state management with Zustand and React Context
- Real-time audio visualization with Web Audio API
- Seamless YouTube integration via yt-dlp
- Offline-first design with Firebase synchronization
- Cross-platform desktop application with Electron
- Comprehensive authentication and user management
- Community features with playlist sharing and discovery

**Architecture Strengths**:
- Modular component design for maintainability
- Service-oriented architecture for business logic separation
- Type-safe development with comprehensive TypeScript interfaces
- Performance optimization for large music libraries
- Robust error handling and offline capabilities
- Extensible plugin system for visualizers and audio effects

This documentation serves as both a technical reference and implementation guide for developers looking to understand or recreate the application's functionality while maintaining the freedom to implement their own visual design and user experience choices.
