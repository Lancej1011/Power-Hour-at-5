#!/usr/bin/env node

/**
 * Fix Firebase Authentication and Rebuild Installer
 * This script applies Firebase fixes and rebuilds the installer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  step: (message) => console.log(`\n🔧 ${message}`),
};

/**
 * Copy source files to installer directory
 */
function copySourceFiles() {
  logger.step('Copying updated source files to installer directory...');
  
  const filesToCopy = [
    {
      src: 'src/config/firebase.ts',
      dest: 'Installer/PHat5/src/config/firebase.ts'
    },
    {
      src: 'src/services/authService.ts', 
      dest: 'Installer/PHat5/src/services/authService.ts'
    }
  ];
  
  for (const file of filesToCopy) {
    try {
      const srcPath = path.join(__dirname, '..', file.src);
      const destPath = path.join(__dirname, '..', file.dest);
      
      if (fs.existsSync(srcPath)) {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(srcPath, destPath);
        logger.success(`Copied: ${file.src} → ${file.dest}`);
      } else {
        logger.warn(`Source file not found: ${file.src}`);
      }
    } catch (error) {
      logger.error(`Failed to copy ${file.src}: ${error.message}`);
    }
  }
}

/**
 * Rebuild the installer application
 */
function rebuildInstaller() {
  logger.step('Rebuilding installer application...');
  
  const installerDir = path.join(__dirname, '..', 'Installer', 'PHat5');
  const originalCwd = process.cwd();
  
  try {
    process.chdir(installerDir);
    
    // Check if we can build
    if (!fs.existsSync('package.json')) {
      logger.error('No package.json found in installer directory');
      return false;
    }
    
    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      logger.info('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
    }
    
    // Build the application
    logger.info('Building application...');
    execSync('npm run build:prod', { stdio: 'inherit' });
    
    logger.success('Application rebuilt successfully');
    return true;
    
  } catch (error) {
    logger.error(`Build failed: ${error.message}`);
    return false;
  } finally {
    process.chdir(originalCwd);
  }
}

/**
 * Copy installer files to output
 */
function copyInstallerFiles() {
  logger.step('Copying installer files to output...');
  
  try {
    execSync('node scripts/copy-installer.cjs', { stdio: 'inherit' });
    logger.success('Installer files copied successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to copy installer files: ${error.message}`);
    return false;
  }
}

/**
 * Display Firebase configuration instructions
 */
function displayFirebaseInstructions() {
  logger.step('Firebase Configuration Required');
  
  console.log(`
🔥 IMPORTANT: Firebase Domain Configuration Required

To fix the Firebase authentication error, you need to add the following domains 
to your Firebase Console:

1. Go to: https://console.firebase.google.com/
2. Select project: phat5-3b9c6
3. Navigate to: Authentication → Settings → Authorized domains
4. Add these domains:
   ✅ localhost
   ✅ 127.0.0.1
   ✅ file://
   ✅ app://
   ✅ electron://

5. Save changes and wait 5-10 minutes for propagation

📖 For detailed instructions, see: scripts/fix-firebase-domains.md

After adding the domains, the authentication should work properly in your 
installed Electron application.
`);
}

/**
 * Main function
 */
function main() {
  try {
    logger.info('🚀 PHat5 Firebase Fix and Rebuild Tool\n');
    
    // Copy updated source files
    copySourceFiles();
    
    // Try to rebuild (but don't fail if it doesn't work)
    logger.info('\nAttempting to rebuild installer application...');
    const rebuildSuccess = rebuildInstaller();
    
    if (!rebuildSuccess) {
      logger.warn('Rebuild failed, but continuing with existing build...');
    }
    
    // Copy installer files
    const copySuccess = copyInstallerFiles();
    
    if (copySuccess) {
      logger.success('\n✅ Firebase fixes applied and installer updated!');
      logger.info('📁 Updated installer available in: installer-output/');
    } else {
      logger.error('\n❌ Failed to update installer files');
    }
    
    // Display Firebase configuration instructions
    displayFirebaseInstructions();
    
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Configure Firebase domains (see instructions above)');
    logger.info('2. Test the updated installer');
    logger.info('3. Verify authentication works in the installed app');
    
  } catch (error) {
    logger.error(`\n❌ Fix and rebuild failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
