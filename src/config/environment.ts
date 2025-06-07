/**
 * Environment configuration for PHat5
 * Handles different settings for development vs production
 */

export interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  maxRecentPlaylists: number;
  maxLibrarySize: number;
  autoSaveInterval: number; // in milliseconds
  version: string;
}

// Get environment from process.env or default to development
const NODE_ENV = process.env.NODE_ENV || 'development';

// Base configuration
const baseConfig = {
  version: '1.0.0',
  maxRecentPlaylists: 10,
  maxLibrarySize: 10000, // Maximum number of songs in library
  autoSaveInterval: 30000, // Auto-save every 30 seconds
};

// Development configuration
const developmentConfig: AppConfig = {
  ...baseConfig,
  isDevelopment: true,
  isProduction: false,
  logLevel: 'debug',
  enableAnalytics: false,
  enableCrashReporting: false,
};

// Production configuration
const productionConfig: AppConfig = {
  ...baseConfig,
  isDevelopment: false,
  isProduction: true,
  logLevel: 'warn',
  enableAnalytics: false, // Set to true if you want analytics
  enableCrashReporting: false, // Set to true if you want crash reporting
};

// Export the appropriate configuration
export const config: AppConfig = NODE_ENV === 'production' ? productionConfig : developmentConfig;

// Utility functions
export const isDevelopment = () => config.isDevelopment;
export const isProduction = () => config.isProduction;

// Feature flags
export const features = {
  enableBetaFeatures: config.isDevelopment,
  enableDebugMode: config.isDevelopment,
  enablePerformanceMonitoring: config.isProduction,
  enableErrorBoundaries: true,
  enableAutoUpdates: config.isProduction,
};

// App constants
export const constants = {
  APP_NAME: 'PHat5',
  DEFAULT_CLIP_DURATION: 60, // seconds
  MIN_CLIP_DURATION: 10, // seconds
  MAX_CLIP_DURATION: 300, // seconds
  SUPPORTED_AUDIO_FORMATS: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
  DEFAULT_VOLUME: 0.8,
  FADE_DURATION: 1000, // milliseconds
  POWER_HOUR_DURATION: 60, // minutes
  CLIPS_PER_POWER_HOUR: 60,
};

export default config;
