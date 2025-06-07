#!/usr/bin/env node

/**
 * Production Build Script for PHat5
 *
 * This script handles the complete production build process including:
 * - Environment setup
 * - Code compilation and optimization
 * - Asset optimization
 * - Electron packaging
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting PHat5 Production Build...\n');

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('npm run clean', { stdio: 'inherit' });

  // Step 2: Run TypeScript compilation
  console.log('📝 Compiling TypeScript...');
  execSync('tsc -b', { stdio: 'inherit' });

  // Step 3: Build optimized frontend
  console.log('⚡ Building optimized frontend...');
  execSync('vite build', { stdio: 'inherit' });

  // Step 4: Verify build output
  console.log('✅ Verifying build output...');
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('Build failed: dist directory not found');
  }

  // Step 5: Package with Electron Builder
  console.log('📦 Packaging with Electron Builder...');
  execSync('electron-builder --publish=never', { stdio: 'inherit' });

  // Step 6: Build complete
  console.log('\n✨ Production build completed successfully!');
  console.log('📁 Output directory: dist-electron/');
  
  // Display build info
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  console.log(`📋 App: ${packageJson.productName || packageJson.name}`);
  console.log(`🏷️  Version: ${packageJson.version}`);
  console.log(`📅 Built: ${new Date().toISOString()}`);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
