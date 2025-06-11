// Global error handler for filter errors - MUST BE FIRST
const originalArrayFilter = Array.prototype.filter;
const originalArrayMap = Array.prototype.map;
const originalArrayForEach = Array.prototype.forEach;

// Override Array.prototype.filter with comprehensive error handling
Array.prototype.filter = function(callback, thisArg) {
  try {
    if (this == null || this === undefined) {
      console.warn('filter() called on null or undefined, returning empty array');
      return [];
    }
    if (!Array.isArray(this)) {
      console.warn('filter() called on non-array, converting to array');
      try {
        return Array.from(this).filter(callback, thisArg);
      } catch (conversionError) {
        console.error('Failed to convert to array:', conversionError);
        return [];
      }
    }
    return originalArrayFilter.call(this, callback, thisArg);
  } catch (error) {
    console.error('Error in filter operation:', error, 'Context:', this);
    return [];
  }
};

// Override Array.prototype.map with error handling
Array.prototype.map = function(callback, thisArg) {
  try {
    if (this == null || this === undefined) {
      console.warn('map() called on null or undefined, returning empty array');
      return [];
    }
    if (!Array.isArray(this)) {
      console.warn('map() called on non-array, converting to array');
      try {
        return Array.from(this).map(callback, thisArg);
      } catch (conversionError) {
        console.error('Failed to convert to array:', conversionError);
        return [];
      }
    }
    return originalArrayMap.call(this, callback, thisArg);
  } catch (error) {
    console.error('Error in map operation:', error, 'Context:', this);
    return [];
  }
};

// Override Array.prototype.forEach with error handling
Array.prototype.forEach = function(callback, thisArg) {
  try {
    if (this == null || this === undefined) {
      console.warn('forEach() called on null or undefined, skipping');
      return;
    }
    if (!Array.isArray(this)) {
      console.warn('forEach() called on non-array, converting to array');
      try {
        Array.from(this).forEach(callback, thisArg);
        return;
      } catch (conversionError) {
        console.error('Failed to convert to array:', conversionError);
        return;
      }
    }
    return originalArrayForEach.call(this, callback, thisArg);
  } catch (error) {
    console.error('Error in forEach operation:', error, 'Context:', this);
  }
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.web.tsx'
import { isWeb } from './utils/platformDetection'

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  if (event.error?.message?.includes('filter')) {
    console.error('Filter error detected during initialization');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Ensure we're running in a web environment
if (!isWeb()) {
  console.error('This build is intended for web deployment only');
}

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Fallback render
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>PHat5 - Loading Error</h1>
        <p>There was an error loading the application. Please refresh the page.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px;">
          Refresh Page
        </button>
      </div>
    `;
  }
}
