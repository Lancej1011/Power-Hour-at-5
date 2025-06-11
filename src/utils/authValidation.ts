/**
 * Authentication Validation Utilities
 * Provides validation functions for authentication forms and user input
 */

// Email validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation criteria
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Password strength levels
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export interface PasswordStrengthResult extends ValidationResult {
  strength: PasswordStrength;
  score: number; // 0-100
  suggestions: string[];
}

/**
 * Email Validation
 */

// Validate email format
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Please enter a valid email address');
  } else if (email.length > 254) {
    errors.push('Email address is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Check if email is from a disposable email provider
export const isDisposableEmail = (email: string): boolean => {
  const disposableDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    // Add more as needed
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};

/**
 * Password Validation
 */

// Basic password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
    
    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push(`Password must be no more than ${PASSWORD_MAX_LENGTH} characters long`);
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Advanced password strength analysis
export const analyzePasswordStrength = (password: string): PasswordStrengthResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      suggestions: ['Enter a password to see strength analysis'],
      strength: 'weak',
      score: 0,
    };
  }
  
  // Length scoring
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  
  // Pattern analysis
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
  if (!/123|abc|qwe|password|admin/i.test(password)) score += 15; // No common patterns
  
  // Generate suggestions
  if (password.length < 8) {
    suggestions.push('Use at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters');
  }
  if (!/\d/.test(password)) {
    suggestions.push('Add numbers');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push('Add special characters');
  }
  if (password.length < 12) {
    suggestions.push('Consider using 12+ characters for better security');
  }
  
  // Determine strength level
  let strength: PasswordStrength;
  if (score < 30) {
    strength = 'weak';
    errors.push('Password is too weak');
  } else if (score < 50) {
    strength = 'fair';
  } else if (score < 70) {
    strength = 'good';
  } else if (score < 85) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }
  
  return {
    isValid: errors.length === 0 && score >= 30,
    errors,
    suggestions,
    strength,
    score,
  };
};

// Validate password confirmation
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: string[] = [];
  
  if (!confirmPassword) {
    errors.push('Please confirm your password');
  } else if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Form Validation
 */

// Validate sign-up form data
export const validateSignUpForm = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  acceptTerms: boolean;
}): ValidationResult => {
  const errors: string[] = [];
  
  // Email validation
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }
  
  // Check for disposable email
  if (emailValidation.isValid && isDisposableEmail(data.email)) {
    errors.push('Please use a permanent email address');
  }
  
  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  // Password confirmation
  const confirmValidation = validatePasswordConfirmation(data.password, data.confirmPassword);
  if (!confirmValidation.isValid) {
    errors.push(...confirmValidation.errors);
  }
  
  // Display name validation (optional)
  if (data.displayName && data.displayName.length > 50) {
    errors.push('Display name must be 50 characters or less');
  }
  
  // Terms acceptance
  if (!data.acceptTerms) {
    errors.push('You must accept the terms of service');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate sign-in form data
export const validateSignInForm = (data: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.password) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate password reset form
export const validatePasswordResetForm = (email: string): ValidationResult => {
  return validateEmail(email);
};

/**
 * Security Validation
 */

// Check if password has been compromised (basic check)
export const isCommonPassword = (password: string): boolean => {
  const commonPasswords = [
    'password',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
  ];
  
  return commonPasswords.includes(password.toLowerCase());
};

// Validate current password for password change
export const validateCurrentPassword = (currentPassword: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!currentPassword) {
    errors.push('Current password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate new password for password change
export const validateNewPassword = (
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
): ValidationResult => {
  const errors: string[] = [];
  
  // Basic new password validation
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  // Check if new password is different from current
  if (currentPassword && newPassword === currentPassword) {
    errors.push('New password must be different from current password');
  }
  
  // Confirm new password
  const confirmValidation = validatePasswordConfirmation(newPassword, confirmNewPassword);
  if (!confirmValidation.isValid) {
    errors.push(...confirmValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};
