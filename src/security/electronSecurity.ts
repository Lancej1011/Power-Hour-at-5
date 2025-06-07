/**
 * Electron Security Configuration for PHat5
 * Implements security best practices for Electron applications
 */

import { app, shell, BrowserWindow } from 'electron';
import { URL } from 'url';

/**
 * Security configuration for the main process
 */
export const configureElectronSecurity = () => {
  // Prevent new window creation and handle navigation
  app.on('web-contents-created', (event, contents) => {
    // Prevent navigation to external URLs
    contents.on('will-navigate', (navigationEvent, navigationURL) => {
      if (isExternalURL(navigationURL)) {
        navigationEvent.preventDefault();
        shell.openExternal(navigationURL);
      }
    });

    // Prevent opening external URLs in the same window
    contents.setWindowOpenHandler(({ url }) => {
      if (isExternalURL(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  // Disable node integration in renderer processes by default
  app.on('browser-window-created', (event, window) => {
    window.webContents.on('dom-ready', () => {
      // Remove any potential security vulnerabilities
      window.webContents.executeJavaScript(`
        delete window.require;
        delete window.exports;
        delete window.module;
      `);
    });
  });
};

/**
 * Check if a URL is external (not part of the app)
 */
const isExternalURL = (url: string): boolean => {
  try {
    const parsedURL = new URL(url);
    
    // Allow local file URLs and localhost
    if (parsedURL.protocol === 'file:' || 
        parsedURL.hostname === 'localhost' || 
        parsedURL.hostname === '127.0.0.1') {
      return false;
    }
    
    // Everything else is considered external
    return true;
  } catch {
    return true;
  }
};

/**
 * Security configuration for BrowserWindow creation
 */
export const getSecureBrowserWindowOptions = (isDevelopment: boolean) => {
  return {
    webSecurity: !isDevelopment, // Disable web security only in development
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    contextIsolation: true,
    enableRemoteModule: false,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webgl: false, // Disable WebGL if not needed
    plugins: false, // Disable plugins
    javascript: true, // Keep JavaScript enabled for React
    images: true,
    textAreasAreResizable: false,
    additionalArguments: [
      '--disable-web-security', // Only for development
      '--disable-features=VizDisplayCompositor'
    ].filter(arg => isDevelopment || !arg.includes('disable-web-security'))
  };
};

/**
 * Content Security Policy for the renderer process
 */
export const getContentSecurityPolicy = (isDevelopment: boolean): string => {
  const baseCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for Material-UI
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  if (isDevelopment) {
    // Allow localhost connections for development
    baseCSP.push("connect-src 'self' ws://localhost:* http://localhost:*");
  }

  return baseCSP.join('; ');
};

/**
 * Validate file paths to prevent directory traversal attacks
 */
export const validateFilePath = (filePath: string): boolean => {
  // Prevent directory traversal
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }

  // Only allow specific file extensions
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.json', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const hasValidExtension = allowedExtensions.some(ext =>
    filePath.toLowerCase().endsWith(ext)
  );

  return hasValidExtension;
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .substring(0, 255); // Limit length
};

export default {
  configureElectronSecurity,
  getSecureBrowserWindowOptions,
  getContentSecurityPolicy,
  validateFilePath,
  sanitizeInput
};
