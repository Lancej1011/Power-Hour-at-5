#!/usr/bin/env node

/**
 * Release Build Script for PHat5
 * Handles complete release process including building, signing, and publishing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  platforms: ['win', 'mac', 'linux'],
  skipCodeSigning: process.env.SKIP_CODE_SIGNING === 'true',
  skipNotarization: process.env.SKIP_NOTARIZATION === 'true',
  draftRelease: process.env.DRAFT_RELEASE === 'true',
  prerelease: process.env.PRERELEASE === 'true',
};

console.log('🚀 Starting PHat5 Release Build Process...\n');

// Validate environment
function validateEnvironment() {
  console.log('🔍 Validating build environment...');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const version = packageJson.version;
  
  console.log(`📋 Building version: ${version}`);
  console.log(`🏷️  Product name: ${packageJson.productName}`);
  
  // Check for required environment variables
  const requiredEnvVars = [];
  const optionalEnvVars = [
    'GH_TOKEN',
    'APPLE_ID',
    'APPLE_ID_PASSWORD',
    'APPLE_TEAM_ID',
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
  ];
  
  // Check GitHub token for publishing
  if (!process.env.GH_TOKEN && !config.draftRelease) {
    console.warn('⚠️  GH_TOKEN not set - publishing will be skipped');
  }
  
  // Check code signing certificates
  if (!config.skipCodeSigning) {
    if (process.platform === 'win32' && !process.env.CSC_LINK) {
      console.warn('⚠️  Windows code signing certificate not configured');
    }
    
    if (process.platform === 'darwin' && (!process.env.APPLE_ID || !process.env.APPLE_TEAM_ID)) {
      console.warn('⚠️  macOS code signing not fully configured');
    }
  }
  
  console.log('✅ Environment validation complete\n');
  return { version, productName: packageJson.productName };
}

// Clean previous builds
function cleanBuilds() {
  console.log('🧹 Cleaning previous builds...');
  try {
    execSync('npm run clean', { stdio: 'inherit' });
    console.log('✅ Clean completed\n');
  } catch (error) {
    console.error('❌ Clean failed:', error.message);
    process.exit(1);
  }
}

// Build application
function buildApplication() {
  console.log('⚡ Building application...');
  try {
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    // TypeScript compilation
    console.log('📝 Compiling TypeScript...');
    execSync('tsc -b', { stdio: 'inherit' });
    
    // Frontend build
    console.log('🎨 Building frontend...');
    execSync('vite build', { stdio: 'inherit' });
    
    // Verify build output
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Build failed: dist directory not found');
    }
    
    console.log('✅ Application build completed\n');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Package with Electron Builder
function packageApplication() {
  console.log('📦 Packaging application...');
  
  try {
    let buildCommand = 'electron-builder';
    
    // Add platform-specific options
    if (process.platform === 'win32') {
      buildCommand += ' --win';
    } else if (process.platform === 'darwin') {
      buildCommand += ' --mac';
    } else {
      buildCommand += ' --linux';
    }
    
    // Add publishing options
    if (config.draftRelease) {
      buildCommand += ' --publish=onTagOrDraft';
    } else if (process.env.GH_TOKEN) {
      buildCommand += ' --publish=always';
    } else {
      buildCommand += ' --publish=never';
    }
    
    console.log(`🔧 Running: ${buildCommand}`);
    execSync(buildCommand, { stdio: 'inherit' });
    
    console.log('✅ Packaging completed\n');
  } catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
  }
}

// Verify build outputs
function verifyBuilds() {
  console.log('🔍 Verifying build outputs...');
  
  const distElectronPath = path.join(__dirname, '..', 'dist-electron');
  if (!fs.existsSync(distElectronPath)) {
    throw new Error('Build verification failed: dist-electron directory not found');
  }
  
  const files = fs.readdirSync(distElectronPath);
  console.log('📁 Build outputs:');
  files.forEach(file => {
    const filePath = path.join(distElectronPath, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${file} (${size} MB)`);
  });
  
  console.log('✅ Build verification completed\n');
}

// Generate release notes
function generateReleaseNotes(version) {
  console.log('📝 Generating release notes...');
  
  const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  let releaseNotes = `# PHat5 v${version}\n\n`;
  
  // Try to extract from changelog
  if (fs.existsSync(changelogPath)) {
    try {
      const changelog = fs.readFileSync(changelogPath, 'utf8');
      const versionSection = changelog.match(new RegExp(`## \\[${version}\\][\\s\\S]*?(?=## \\[|$)`));
      if (versionSection) {
        releaseNotes += versionSection[0];
      } else {
        releaseNotes += 'See CHANGELOG.md for details.';
      }
    } catch (error) {
      console.warn('⚠️  Could not extract from changelog:', error.message);
      releaseNotes += 'Release notes not available.';
    }
  } else {
    releaseNotes += `## What's New\n\n- Bug fixes and improvements\n- Enhanced stability and performance\n\n## Installation\n\nDownload the appropriate installer for your platform:\n\n- **Windows**: PHat5-Setup-${version}.exe\n- **macOS**: PHat5-${version}.dmg\n- **Linux**: PHat5-${version}.AppImage\n\n## System Requirements\n\n- Windows 10 or later\n- macOS 10.14 or later\n- Linux (64-bit)\n\n## Support\n\nFor support and bug reports, please visit our [GitHub repository](https://github.com/Lancej1011/Power-Hour-at-5).`;
  }
  
  fs.writeFileSync(releaseNotesPath, releaseNotes);
  console.log(`✅ Release notes generated: ${releaseNotesPath}\n`);
  
  return releaseNotes;
}

// Create GitHub release
function createGitHubRelease(version, releaseNotes) {
  if (!process.env.GH_TOKEN) {
    console.log('⚠️  Skipping GitHub release creation - GH_TOKEN not set\n');
    return;
  }
  
  console.log('🐙 Creating GitHub release...');
  
  try {
    let releaseCommand = `gh release create v${version}`;
    
    if (config.draftRelease) {
      releaseCommand += ' --draft';
    }
    
    if (config.prerelease) {
      releaseCommand += ' --prerelease';
    }
    
    releaseCommand += ` --title "PHat5 v${version}"`;
    releaseCommand += ` --notes "${releaseNotes.replace(/"/g, '\\"')}"`;
    
    // Add build artifacts
    const distElectronPath = path.join(__dirname, '..', 'dist-electron');
    const files = fs.readdirSync(distElectronPath);
    const artifacts = files.filter(file => 
      file.endsWith('.exe') || 
      file.endsWith('.dmg') || 
      file.endsWith('.AppImage') || 
      file.endsWith('.deb') || 
      file.endsWith('.rpm') ||
      file.endsWith('.zip')
    );
    
    artifacts.forEach(artifact => {
      releaseCommand += ` "${path.join(distElectronPath, artifact)}"`;
    });
    
    console.log(`🔧 Creating release: v${version}`);
    execSync(releaseCommand, { stdio: 'inherit' });
    
    console.log('✅ GitHub release created\n');
  } catch (error) {
    console.error('❌ GitHub release creation failed:', error.message);
    console.log('   You can create the release manually using the generated artifacts\n');
  }
}

// Main execution
async function main() {
  try {
    const { version, productName } = validateEnvironment();
    
    cleanBuilds();
    buildApplication();
    packageApplication();
    verifyBuilds();
    
    const releaseNotes = generateReleaseNotes(version);
    createGitHubRelease(version, releaseNotes);
    
    console.log('🎉 Release build completed successfully!');
    console.log(`📦 Version: ${version}`);
    console.log(`📁 Output: dist-electron/`);
    console.log(`🌐 GitHub: https://github.com/Lancej1011/Power-Hour-at-5/releases`);
    
  } catch (error) {
    console.error('❌ Release build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
