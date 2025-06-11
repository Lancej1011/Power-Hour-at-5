#!/usr/bin/env node

/**
 * Simple Installer Copy Script for PHat5
 * Copies existing installers from the Installer directory to the main output
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  installerDir: path.join(__dirname, '..', 'Installer', 'PHat5'),
  outputDir: path.join(__dirname, '..', 'installer-output'),
  sourceOutputDirs: [
    'installer-output',
    'installer-output-v2', 
    'installer-output-v3'
  ]
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
 * Create output directory if it doesn't exist
 */
function ensureOutputDirectory() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    logger.info(`Created output directory: ${config.outputDir}`);
  }
}

/**
 * Find and copy installer files
 */
function copyInstallerFiles() {
  logger.step('Copying installer files...');
  
  let copiedFiles = 0;
  
  for (const sourceDir of config.sourceOutputDirs) {
    const sourcePath = path.join(config.installerDir, sourceDir);
    
    if (!fs.existsSync(sourcePath)) {
      logger.info(`Source directory not found: ${sourceDir}`);
      continue;
    }
    
    logger.info(`Checking source directory: ${sourceDir}`);
    
    const files = fs.readdirSync(sourcePath);
    const installerFiles = files.filter(file => 
      file.endsWith('.exe') || 
      file.endsWith('.dmg') || 
      file.endsWith('.AppImage') || 
      file.endsWith('.deb') || 
      file.endsWith('.rpm') ||
      file.endsWith('.zip') ||
      file.endsWith('.yml') ||
      file.endsWith('.blockmap')
    );
    
    for (const file of installerFiles) {
      const sourcePath = path.join(config.installerDir, sourceDir, file);
      const destPath = path.join(config.outputDir, file);
      
      try {
        // Check if destination already exists and is newer
        if (fs.existsSync(destPath)) {
          const sourceStats = fs.statSync(sourcePath);
          const destStats = fs.statSync(destPath);
          
          if (destStats.mtime >= sourceStats.mtime) {
            logger.info(`Skipping ${file} (destination is newer)`);
            continue;
          }
        }
        
        fs.copyFileSync(sourcePath, destPath);
        logger.success(`Copied: ${file}`);
        copiedFiles++;
        
      } catch (error) {
        logger.error(`Failed to copy ${file}: ${error.message}`);
      }
    }
  }
  
  return copiedFiles;
}

/**
 * Generate build summary
 */
function generateSummary() {
  logger.step('Generating summary...');
  
  if (!fs.existsSync(config.outputDir)) {
    logger.warn('Output directory does not exist');
    return;
  }
  
  const files = fs.readdirSync(config.outputDir);
  const installerFiles = files.filter(file => 
    file.endsWith('.exe') || 
    file.endsWith('.dmg') || 
    file.endsWith('.AppImage') || 
    file.endsWith('.deb') || 
    file.endsWith('.rpm') ||
    file.endsWith('.zip')
  );
  
  let summary = `# PHat5 Installer Summary\n\n`;
  summary += `**Generated:** ${new Date().toISOString()}\n`;
  summary += `**Output Directory:** ${config.outputDir}\n\n`;
  
  if (installerFiles.length === 0) {
    summary += `No installer files found.\n`;
  } else {
    summary += `## Available Installers\n\n`;
    
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
  }
  
  summary += `## Installation\n\n`;
  summary += `### Windows\n`;
  summary += `1. Download \`PHat5 Setup 1.1.0.exe\`\n`;
  summary += `2. Run the installer\n`;
  summary += `3. Follow the installation wizard\n\n`;
  
  summary += `### Portable Version\n`;
  summary += `1. Download \`PHat5 1.1.0.exe\`\n`;
  summary += `2. Run directly (no installation required)\n\n`;
  
  summary += `## Auto-Updates\n\n`;
  summary += `The installed version includes automatic update checking.\n`;
  summary += `Updates are distributed via GitHub releases.\n\n`;
  
  summary += `## Files\n\n`;
  for (const file of files) {
    const filePath = path.join(config.outputDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    summary += `- \`${file}\` (${sizeMB} MB)\n`;
  }
  
  const summaryPath = path.join(config.outputDir, 'README.md');
  fs.writeFileSync(summaryPath, summary);
  
  logger.success(`Summary generated: ${summaryPath}`);
}

/**
 * Main function
 */
function main() {
  try {
    logger.info('🚀 PHat5 Installer Copy Tool\n');
    
    ensureOutputDirectory();
    const copiedFiles = copyInstallerFiles();
    generateSummary();
    
    logger.success(`\n✅ Copy completed!`);
    logger.info(`📁 Output directory: ${config.outputDir}`);
    logger.info(`📦 Files copied: ${copiedFiles}`);
    
    // List final output
    const files = fs.readdirSync(config.outputDir);
    logger.info(`\n📋 Available files:`);
    files.forEach(file => {
      const filePath = path.join(config.outputDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      logger.info(`   ${file} (${sizeMB} MB)`);
    });
    
  } catch (error) {
    logger.error(`\n❌ Copy failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
