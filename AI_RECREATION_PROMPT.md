# AI Recreation Prompt for Power Hour at 5

## Objective
Create a functionally identical recreation of the Power Hour at 5 application using the provided technical documentation. You have complete freedom to design your own visual interface, styling, and user experience while maintaining all specified functionality and business logic.

## Core Requirements

### 1. Functional Completeness
Implement ALL features described in the technical documentation:
- Music library management with multiple library support
- Mix creation with clip extraction and waveform visualization
- Playlist management (regular and YouTube playlists)
- YouTube integration via yt-dlp with search and channel browsing
- Real-time audio visualization with 8 visualizer types
- Community playlist sharing and discovery
- Drinking clips system with audio/video overlay
- User authentication with Firebase integration
- Cross-platform desktop application using Electron

### 2. Architecture Requirements
Follow the specified architecture patterns:
- React 19 with TypeScript for the frontend
- Zustand stores for state management as specified
- React Context providers for cross-cutting concerns
- Service layer architecture with the specified services
- Hybrid storage (Firebase + localStorage) for offline-first design
- Electron for desktop application framework

### 3. Data Models
Implement the exact TypeScript interfaces and data structures specified in the documentation:
- All playlist, mix, and user interfaces
- Authentication and user profile structures
- YouTube integration data models
- Library and song metadata structures
- Maintain data compatibility for import/export functionality

### 4. External Integrations
Implement all specified external integrations:
- Firebase Auth and Firestore with the exact collection structure
- YouTube integration using yt-dlp-wrap
- Google OAuth for YouTube API access
- Audio processing with Howler.js and Web Audio API
- Music metadata extraction with music-metadata library

### 5. Business Logic
Preserve all business logic and user workflows:
- Authentication flows (Google, email, anonymous, account linking)
- Playlist creation, editing, and sharing workflows
- Mix creation with clip extraction process
- Community discovery and rating system
- Audio playback with seamless transitions
- Drinking clips integration with volume ducking

## Design Freedom

### What You Can Change
- **Visual Design**: Create your own color schemes, typography, spacing, and visual hierarchy
- **UI Components**: Design custom components or use any UI library (Material-UI, Chakra UI, Ant Design, etc.)
- **Layout and Navigation**: Design your own navigation patterns, page layouts, and responsive behavior
- **Animations and Transitions**: Implement your own animation system and visual effects
- **Icons and Graphics**: Use any icon library or create custom graphics
- **Theme System**: Design your own theming approach while supporting light/dark modes

### What You Must Preserve
- **All functional capabilities** described in the documentation
- **Data structures and APIs** for compatibility
- **State management patterns** using Zustand and React Context
- **Service layer architecture** and business logic
- **External integration patterns** and data flow
- **User workflows** and feature interactions
- **Performance characteristics** (virtualization, caching, etc.)

## Implementation Guidelines

### 1. Start with Core Architecture
Begin by implementing the foundational architecture:
```typescript
// Set up the exact Zustand stores as specified
// Implement React Context providers
// Create the service layer with specified methods
// Set up routing and navigation structure
```

### 2. Implement Data Layer First
Establish the data management foundation:
```typescript
// Firebase configuration and authentication
// localStorage fallback mechanisms
// Data synchronization patterns
// TypeScript interfaces and types
```

### 3. Build Features Incrementally
Implement features in this recommended order:
1. Authentication system and user management
2. Music library management and scanning
3. Basic audio playback functionality
4. Mix creation and clip extraction
5. Playlist management (regular playlists)
6. YouTube integration and YouTube playlists
7. Audio visualization system
8. Community features and playlist sharing
9. Drinking clips system
10. Settings and preferences management

### 4. Maintain API Compatibility
Ensure your implementation can:
- Import/export playlists using the same share code system
- Sync data with the same Firebase structure
- Handle the same file formats and metadata
- Provide the same Electron IPC interface

### 5. Testing and Validation
Verify your implementation:
- All user workflows function as described
- Data persistence and synchronization work correctly
- Audio playback and visualization perform smoothly
- Cross-platform compatibility is maintained
- Import/export functionality is compatible

## Technical Specifications to Follow

### Required Dependencies
Use the exact versions specified in the documentation for core functionality:
- React 19, Zustand 5.0.5, Firebase 11.9.0
- Howler.js, music-metadata-browser, yt-dlp-wrap
- Electron 36.1.0 for desktop application

### State Management Structure
Implement the exact Zustand store structures:
- AuthStore with all specified state and actions
- PlaylistStore with unified playlist management
- YouTubeAuthStore for YouTube authentication

### Service Layer Implementation
Create all specified services with the same method signatures:
- authService, userDataService, playlistDataService
- firebasePlaylistService, ytDlpService, adminService

### Component Architecture
Follow the component hierarchy and responsibilities described:
- Main App component with context providers
- Feature-specific components (SongUploader, Playlists, etc.)
- Utility components (UnifiedMediaBar, WindowControls, etc.)

## Success Criteria

Your implementation is successful when:
1. **Functional Parity**: All features work exactly as described in the documentation
2. **Data Compatibility**: Can import/export data from the original application
3. **Performance**: Meets the same performance characteristics (smooth audio, responsive UI)
4. **Cross-Platform**: Runs on Windows, macOS, and Linux via Electron
5. **Offline Capability**: Functions offline with localStorage fallback
6. **Community Integration**: Can share and discover playlists with other users

## Final Notes

This is a comprehensive application with sophisticated audio processing, real-time visualization, and complex state management. Focus on implementing the core functionality first, then enhance the user experience with your own design vision.

The original application demonstrates excellent software architecture principles - maintain these while expressing your own creativity in the user interface and experience design.

Remember: The goal is functional recreation with design freedom, not visual replication. Create something that works identically but looks uniquely yours.
