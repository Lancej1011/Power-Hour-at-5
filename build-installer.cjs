#!/usr/bin/env node

/**
 * Simple installer build script for PHat5
 * This script builds the installer without the problematic notarization
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building PHat5 Installer...');

// Step 1: Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist-electron')) {
    fs.rmSync('dist-electron', { recursive: true, force: true });
  }
} catch (error) {
  console.warn('⚠️ Could not clean dist-electron:', error.message);
}

// Step 2: Build the frontend
console.log('🔨 Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 3: Create a temporary electron-builder config without notarization
console.log('📝 Creating temporary build config...');
const originalConfig = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));
const tempConfig = { ...originalConfig };

// Remove problematic settings
delete tempConfig.afterSign;
tempConfig.win.sign = null;

// Ensure electron-updater is included
tempConfig.files = [
  "dist/**/*",
  "main.cjs",
  "preload.cjs",
  "package.json",
  "node_modules/electron-updater/**/*",
  "!node_modules/**/*",
  "!src/**/*",
  "!*.md",
  "!*.log",
  "!.env*",
  "!tsconfig*.json",
  "!vite.config.ts",
  "!eslint.config.js"
];

fs.writeFileSync('electron-builder-temp.json', JSON.stringify(tempConfig, null, 2));

// Step 4: Build the installer
console.log('📦 Building installer...');
try {
  execSync('npx electron-builder --config electron-builder-temp.json --publish=never', { 
    stdio: 'inherit',
    env: { ...process.env, SKIP_CODE_SIGNING: 'true' }
  });
} catch (error) {
  console.error('❌ Installer build failed:', error.message);
  // Clean up temp file
  if (fs.existsSync('electron-builder-temp.json')) {
    fs.unlinkSync('electron-builder-temp.json');
  }
  process.exit(1);
}

// Step 5: Clean up
console.log('🧹 Cleaning up...');
if (fs.existsSync('electron-builder-temp.json')) {
  fs.unlinkSync('electron-builder-temp.json');
}

// Step 6: Show results
console.log('✅ Build completed successfully!');
console.log('\n📁 Output files:');
const distDir = 'dist-electron';
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile() && (file.endsWith('.exe') || file.endsWith('.zip'))) {
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📄 ${file} (${sizeInMB} MB)`);
    }
  });
}

console.log('\n🎉 Your installer is ready!');
console.log('   • Run the .exe file to install PHat5');
console.log('   • Share the .zip file for portable use');
