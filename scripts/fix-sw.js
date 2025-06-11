import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix service worker to properly handle index.html
function fixServiceWorker() {
  const swPath = path.join(__dirname, '..', 'dist-web', 'sw.js');
  
  if (!fs.existsSync(swPath)) {
    console.log('Service worker not found, skipping fix');
    return;
  }
  
  let swContent = fs.readFileSync(swPath, 'utf8');

  console.log('Original SW content contains index.web.html:', swContent.includes('index.web.html'));

  // Replace index.web.html with index.html in the precache list
  const originalContent = swContent;
  swContent = swContent.replace(/index\.web\.html/g, 'index.html');

  // Also replace the URL in the precache array specifically
  swContent = swContent.replace(/\{url:"index\.web\.html"/g, '{url:"index.html"');

  // Fix the navigation route handler to use the correct path
  swContent = swContent.replace(/createHandlerBoundToURL\("index\.html"\)/g, 'createHandlerBoundToURL("/index.html")');

  // Remove the navigation route entirely to prevent the error
  swContent = swContent.replace(/,e\.registerRoute\(new e\.NavigationRoute\(e\.createHandlerBoundToURL\("index\.html"\)\)\)/g, '');
  swContent = swContent.replace(/e\.registerRoute\(new e\.NavigationRoute\(e\.createHandlerBoundToURL\("index\.html"\)\)\)/g, '');

  // More specific pattern for the exact content
  swContent = swContent.replace(/e\.cleanupOutdatedCaches\(\),e\.registerRoute\(new e\.NavigationRoute\(e\.createHandlerBoundToURL\("index\.html"\)\)\)/g, 'e.cleanupOutdatedCaches()');

  console.log('Content changed:', originalContent !== swContent);
  console.log('Fixed SW content contains index.html:', swContent.includes('index.html'));
  console.log('Fixed SW content still contains index.web.html:', swContent.includes('index.web.html'));
  console.log('Fixed SW content contains navigation route:', swContent.includes('NavigationRoute'));

  fs.writeFileSync(swPath, swContent);
  console.log('✅ Fixed service worker to use index.html');
}

// Rename index.web.html to index.html if it exists
function renameIndexFile() {
  const webHtmlPath = path.join(__dirname, '..', 'dist-web', 'index.web.html');
  const htmlPath = path.join(__dirname, '..', 'dist-web', 'index.html');
  
  if (fs.existsSync(webHtmlPath)) {
    fs.renameSync(webHtmlPath, htmlPath);
    console.log('✅ Renamed index.web.html to index.html');
  }
}

// Run the fixes
renameIndexFile();
fixServiceWorker();
