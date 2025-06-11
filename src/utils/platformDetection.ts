/**
 * Platform detection utilities for PHat5
 * Helps determine if the app is running in Electron, Web, or other environments
 */

// Check if running in Electron environment
export const isElectron = (): boolean => {
  // Check for Electron-specific APIs
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true;
  }
  
  // Check for Node.js process in renderer
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true;
  }
  
  // Check user agent
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  
  return false;
};

// Check if running in web browser
export const isWeb = (): boolean => {
  return !isElectron() && typeof window !== 'undefined' && typeof document !== 'undefined';
};

// Check if running as PWA
export const isPWA = (): boolean => {
  if (!isWeb()) return false;
  
  // Check if installed as PWA
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for PWA navigator (iOS Safari)
  if ('serviceWorker' in navigator && (window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
};

// Check if mobile device
export const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if touch device
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get platform type
export type PlatformType = 'electron' | 'web' | 'pwa' | 'mobile';

export const getPlatformType = (): PlatformType => {
  if (isElectron()) return 'electron';
  if (isMobile()) return 'mobile';
  if (isPWA()) return 'pwa';
  return 'web';
};

// Platform capabilities
export interface PlatformCapabilities {
  fileSystemAccess: boolean;
  nativeAudioProcessing: boolean;
  localFileUpload: boolean;
  notifications: boolean;
  fullscreen: boolean;
  clipboard: boolean;
  dragAndDrop: boolean;
}

export const getPlatformCapabilities = (): PlatformCapabilities => {
  const platform = getPlatformType();
  
  switch (platform) {
    case 'electron':
      return {
        fileSystemAccess: true,
        nativeAudioProcessing: true,
        localFileUpload: true,
        notifications: true,
        fullscreen: true,
        clipboard: true,
        dragAndDrop: true,
      };
    
    case 'web':
    case 'pwa':
      return {
        fileSystemAccess: 'showDirectoryPicker' in window,
        nativeAudioProcessing: false,
        localFileUpload: true,
        notifications: 'Notification' in window,
        fullscreen: 'requestFullscreen' in document.documentElement,
        clipboard: 'clipboard' in navigator,
        dragAndDrop: true,
      };
    
    case 'mobile':
      return {
        fileSystemAccess: false,
        nativeAudioProcessing: false,
        localFileUpload: true,
        notifications: 'Notification' in window,
        fullscreen: 'requestFullscreen' in document.documentElement,
        clipboard: 'clipboard' in navigator,
        dragAndDrop: false,
      };
    
    default:
      return {
        fileSystemAccess: false,
        nativeAudioProcessing: false,
        localFileUpload: false,
        notifications: false,
        fullscreen: false,
        clipboard: false,
        dragAndDrop: false,
      };
  }
};

// Feature detection
export const hasFeature = (feature: keyof PlatformCapabilities): boolean => {
  const capabilities = getPlatformCapabilities();
  return capabilities[feature];
};

// Environment info for debugging
export const getEnvironmentInfo = () => {
  return {
    platform: getPlatformType(),
    isElectron: isElectron(),
    isWeb: isWeb(),
    isPWA: isPWA(),
    isMobile: isMobile(),
    isTouchDevice: isTouchDevice(),
    capabilities: getPlatformCapabilities(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };
};
