#!/usr/bin/env node

/**
 * Professional Installer Build Script for PHat5
 * Builds production-ready installers with code signing and auto-update support
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// __dirname is available in CommonJS by default

// Configuration
const config = {
  // Paths
  rootDir: path.join(__dirname, '..'),
  installerDir: path.join(__dirname, '..'), // Use current directory instead of Installer/PHat5
  outputDir: path.join(__dirname, '..', 'installer-output'),
  
  // Build options
  platforms: process.env.BUILD_PLATFORMS ? process.env.BUILD_PLATFORMS.split(',') : ['win'],
  skipCodeSigning: process.env.SKIP_CODE_SIGNING === 'true',
  skipNotarization: process.env.SKIP_NOTARIZATION === 'true',
  publishToGitHub: process.env.PUBLISH_GITHUB === 'true',
  
  // Installer options
  createPortable: true,
  createMSI: false, // Windows MSI installer
  createNSIS: true, // Windows NSIS installer
  
  // Code signing
  certificateFile: process.env.CSC_LINK,
  certificatePassword: process.env.CSC_KEY_PASSWORD,
  
  // GitHub
  githubToken: process.env.GH_TOKEN,
};

/**
 * Logger utility
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  step: (message) => console.log(`\n🔧 ${message}`),
};

/**
 * Validate build environment
 */
function validateEnvironment() {
  logger.step('Validating build environment...');
  
  // Check if installer directory exists
  if (!fs.existsSync(config.installerDir)) {
    throw new Error(`Installer directory not found: ${config.installerDir}`);
  }
  
  // Check if package.json exists in installer directory
  const packageJsonPath = path.join(config.installerDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found in installer directory: ${packageJsonPath}`);
  }
  
  // Read version information
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  const productName = packageJson.productName;
  
  logger.info(`Building ${productName} v${version}`);
  
  // Check for required tools
  try {
    execSync('npx electron-builder --version', { stdio: 'pipe' });
  } catch (error) {
    try {
      execSync('npm list electron-builder', { stdio: 'pipe' });
      logger.info('electron-builder found locally');
    } catch (localError) {
      throw new Error('electron-builder not found. Please install it: npm install electron-builder');
    }
  }
  
  // Check code signing setup
  if (!config.skipCodeSigning) {
    if (process.platform === 'win32') {
      if (!config.certificateFile) {
        logger.warn('Windows code signing certificate not configured (CSC_LINK not set)');
      } else if (!fs.existsSync(config.certificateFile)) {
        logger.warn(`Certificate file not found: ${config.certificateFile}`);
      }
    }
  }
  
  // Create output directory
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  logger.success('Environment validation completed');
  return { version, productName };
}

/**
 * Prepare installer source
 */
function prepareInstallerSource() {
  logger.step('Preparing installer source...');
  
  const installerPackageJson = path.join(config.installerDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(installerPackageJson, 'utf8'));
  
  // Update repository URLs to match the actual repository (if they exist)
  if (packageJson.homepage) {
    packageJson.homepage = 'https://github.com/Lancej1011/Power-Hour-at-5';
  }
  if (packageJson.repository && packageJson.repository.url) {
    packageJson.repository.url = 'https://github.com/Lancej1011/Power-Hour-at-5.git';
  }
  if (packageJson.bugs && packageJson.bugs.url) {
    packageJson.bugs.url = 'https://github.com/Lancej1011/Power-Hour-at-5/issues';
  }

  // Write updated package.json
  fs.writeFileSync(installerPackageJson, JSON.stringify(packageJson, null, 2));
  
  logger.success('Installer source prepared');
}

/**
 * Build the application
 */
function buildApplication() {
  logger.step('Checking application build...');

  const distPath = path.join(config.installerDir, 'dist');
  const distElectronPath = path.join(config.installerDir, 'dist-electron');

  // Check if application is already built
  if (fs.existsSync(distPath) && fs.existsSync(distElectronPath)) {
    logger.info('Application appears to be already built, skipping build step');
    logger.success('Using existing application build');
    return;
  }

  logger.step('Building application...');

  const originalCwd = process.cwd();

  try {
    // Change to installer directory
    process.chdir(config.installerDir);

    // Try to clean previous builds (but don't fail if it doesn't work)
    logger.info('Attempting to clean previous builds...');
    try {
      execSync('npm run clean', { stdio: 'pipe' });
      logger.info('Clean completed successfully');
    } catch (error) {
      logger.warn('Clean command failed, continuing with existing files...');
    }

    // Build the application
    logger.info('Building application...');
    execSync('npm run build:prod', { stdio: 'inherit' });

    logger.success('Application build completed');

  } finally {
    // Restore original working directory
    process.chdir(originalCwd);
  }
}

/**
 * Create installers
 */
function createInstallers() {
  logger.step('Creating installers...');
  
  const originalCwd = process.cwd();
  
  try {
    // Change to installer directory
    process.chdir(config.installerDir);
    
    for (const platform of config.platforms) {
      logger.info(`Creating installer for ${platform}...`);
      
      let buildCommand = 'npx electron-builder';
      
      // Add platform-specific options
      switch (platform.toLowerCase()) {
        case 'win':
        case 'windows':
          buildCommand += ' --win';
          break;
        case 'mac':
        case 'macos':
          buildCommand += ' --mac';
          break;
        case 'linux':
          buildCommand += ' --linux';
          break;
        default:
          logger.warn(`Unknown platform: ${platform}, skipping...`);
          continue;
      }
      
      // Add publishing options
      if (config.publishToGitHub && config.githubToken) {
        buildCommand += ' --publish=always';
      } else {
        buildCommand += ' --publish=never';
      }
      
      // Add code signing options
      if (config.skipCodeSigning) {
        process.env.SKIP_CODE_SIGNING = 'true';
      }
      
      // Execute build command
      logger.info(`Executing: ${buildCommand}`);
      execSync(buildCommand, { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      logger.success(`Installer created for ${platform}`);
    }
    
  } finally {
    // Restore original working directory
    process.chdir(originalCwd);
  }
}

/**
 * Copy installers to output directory
 */
function copyInstallersToOutput() {
  logger.step('Copying installers to output directory...');
  
  const distElectronPath = path.join(config.installerDir, 'dist-electron');
  
  if (!fs.existsSync(distElectronPath)) {
    logger.warn('No dist-electron directory found, skipping copy');
    return;
  }
  
  const files = fs.readdirSync(distElectronPath);
  const installerFiles = files.filter(file => 
    file.endsWith('.exe') || 
    file.endsWith('.dmg') || 
    file.endsWith('.AppImage') || 
    file.endsWith('.deb') || 
    file.endsWith('.rpm') ||
    file.endsWith('.zip') ||
    file.endsWith('.tar.gz')
  );
  
  for (const file of installerFiles) {
    const sourcePath = path.join(distElectronPath, file);
    const destPath = path.join(config.outputDir, file);
    
    logger.info(`Copying ${file}...`);
    fs.copyFileSync(sourcePath, destPath);
  }
  
  // Copy additional files
  const additionalFiles = ['latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'RELEASES'];
  for (const file of additionalFiles) {
    const sourcePath = path.join(distElectronPath, file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(config.outputDir, file);
      fs.copyFileSync(sourcePath, destPath);
      logger.info(`Copied ${file}`);
    }
  }
  
  logger.success(`Installers copied to: ${config.outputDir}`);
}

/**
 * Generate build summary
 */
function generateBuildSummary() {
  logger.step('Generating build summary...');
  
  const files = fs.readdirSync(config.outputDir);
  const installerFiles = files.filter(file => 
    file.endsWith('.exe') || 
    file.endsWith('.dmg') || 
    file.endsWith('.AppImage') || 
    file.endsWith('.deb') || 
    file.endsWith('.rpm') ||
    file.endsWith('.zip')
  );
  
  let summary = `# PHat5 Installer Build Summary\n\n`;
  summary += `**Build Date:** ${new Date().toISOString()}\n`;
  summary += `**Build Platform:** ${process.platform}\n\n`;
  
  summary += `## Generated Installers\n\n`;
  
  let totalSize = 0;
  for (const file of installerFiles) {
    const filePath = path.join(config.outputDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalSize += stats.size;
    
    summary += `- **${file}** (${sizeMB} MB)\n`;
  }
  
  summary += `\n**Total Size:** ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`;
  summary += `**Total Files:** ${installerFiles.length}\n\n`;
  
  summary += `## Installation Instructions\n\n`;
  summary += `### Windows\n`;
  summary += `1. Download the \`.exe\` installer\n`;
  summary += `2. Run the installer as administrator\n`;
  summary += `3. Follow the installation wizard\n\n`;
  
  summary += `### macOS\n`;
  summary += `1. Download the \`.dmg\` file\n`;
  summary += `2. Open the DMG and drag PHat5 to Applications\n`;
  summary += `3. Launch from Applications folder\n\n`;
  
  summary += `### Linux\n`;
  summary += `1. Download the \`.AppImage\` file\n`;
  summary += `2. Make it executable: \`chmod +x PHat5-*.AppImage\`\n`;
  summary += `3. Run the AppImage\n\n`;
  
  const summaryPath = path.join(config.outputDir, 'BUILD_SUMMARY.md');
  fs.writeFileSync(summaryPath, summary);
  
  logger.success(`Build summary generated: ${summaryPath}`);
}

/**
 * Main build function
 */
async function main() {
  try {
    logger.info('🚀 Starting PHat5 Professional Installer Build...\n');
    
    const { version, productName } = validateEnvironment();
    prepareInstallerSource();
    buildApplication();
    createInstallers();
    copyInstallersToOutput();
    generateBuildSummary();
    
    logger.success(`\n🎉 Build completed successfully!`);
    logger.info(`📦 Version: ${version}`);
    logger.info(`📁 Output: ${config.outputDir}`);
    logger.info(`🌐 Ready for distribution`);
    
  } catch (error) {
    logger.error(`\n❌ Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
