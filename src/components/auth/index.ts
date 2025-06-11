/**
 * Authentication Components Index
 * Centralized exports for all authentication-related components
 */

// Core authentication components
export { default as LoginModal } from './LoginModal';
export { default as UserProfile } from './UserProfile';
export { default as AuthStatusIndicator } from './AuthStatusIndicator';
export { default as OnboardingFlow } from './OnboardingFlow';
export { default as SyncStatusIndicator } from './SyncStatusIndicator';

// Email authentication components
export { default as EmailSignIn } from './EmailSignIn';
export { default as SignUpForm } from './SignUpForm';
export { default as PasswordReset } from './PasswordReset';

// Advanced authentication components
export { default as AccountLinking } from './AccountLinking';
export { default as SecuritySettings } from './SecuritySettings';
export { default as AccountManagement } from './AccountManagement';

// Authentication prompts and utilities
export { default as AuthPrompt } from './AuthPrompt';

// Re-export auth context hooks for convenience
export {
  useAuth,
  useAuthStatus,
  useUserProfile,
  useUserPreferences,
  AuthProvider,
  withAuth,
} from '../../contexts/AuthContext';
