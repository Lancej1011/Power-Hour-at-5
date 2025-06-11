/**
 * Types Index
 * Centralized exports for all type definitions
 */

// Re-export all authentication types
export * from './auth';

// Re-export YouTube authentication types
export * from './youtube-auth';

// Explicit re-exports for commonly used types
export type { AuthMethod, AuthStatus, AuthUser, UserProfile, UserPreferences } from './auth';
export type { YouTubeAuthMethod } from './youtube-auth';
