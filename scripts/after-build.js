#!/usr/bin/env node

/**
 * After Build Script for PHat5
 * Handles post-build processing, verification, and artifact preparation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  distPath: path.join(__dirname, '..', 'dist-electron'),
  checksumAlgorithms: ['sha256', 'sha512'],
  generateChecksums: true,
  verifySignatures: true,
  createReleaseNotes: true,
};

/**
 * Logger utility
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
};

/**
 * Generate checksums for build artifacts
 */
function generateChecksums(artifacts) {
  logger.info('Generating checksums for build artifacts...');
  
  const checksums = {};
  
  for (const artifact of artifacts) {
    const filePath = path.join(config.distPath, artifact.file);
    
    if (!fs.existsSync(filePath)) {
      logger.warn(`Artifact not found: ${artifact.file}`);
      continue;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    checksums[artifact.file] = {};
    
    for (const algorithm of config.checksumAlgorithms) {
      const hash = crypto.createHash(algorithm);
      hash.update(fileBuffer);
      checksums[artifact.file][algorithm] = hash.digest('hex');
      
      logger.info(`${algorithm.toUpperCase()}: ${checksums[artifact.file][algorithm]} - ${artifact.file}`);
    }
  }
  
  // Write checksums to file
  const checksumFile = path.join(config.distPath, 'CHECKSUMS.txt');
  let checksumContent = `# PHat5 Build Artifacts Checksums\n`;
  checksumContent += `# Generated: ${new Date().toISOString()}\n\n`;
  
  for (const [file, hashes] of Object.entries(checksums)) {
    checksumContent += `## ${file}\n`;
    for (const [algorithm, hash] of Object.entries(hashes)) {
      checksumContent += `${algorithm.toUpperCase()}: ${hash}\n`;
    }
    checksumContent += '\n';
  }
  
  fs.writeFileSync(checksumFile, checksumContent);
  logger.success(`Checksums written to: ${checksumFile}`);
  
  return checksums;
}

/**
 * Verify code signatures on built artifacts
 */
function verifySignatures(artifacts) {
  logger.info('Verifying code signatures...');
  
  const results = {};
  
  for (const artifact of artifacts) {
    const filePath = path.join(config.distPath, artifact.file);
    
    if (!fs.existsSync(filePath)) {
      continue;
    }
    
    // Only verify Windows executables and installers
    if (!artifact.file.endsWith('.exe')) {
      continue;
    }
    
    try {
      // Use signtool to verify signature
      execSync(`signtool verify /pa /v "${filePath}"`, { stdio: 'pipe' });
      results[artifact.file] = { signed: true, verified: true };
      logger.success(`Signature verified: ${artifact.file}`);
      
    } catch (error) {
      results[artifact.file] = { signed: false, verified: false, error: error.message };
      logger.warn(`Signature verification failed: ${artifact.file}`);
    }
  }
  
  return results;
}

/**
 * Get build artifact information
 */
function getBuildArtifacts() {
  const artifacts = [];
  
  if (!fs.existsSync(config.distPath)) {
    logger.error(`Distribution directory not found: ${config.distPath}`);
    return artifacts;
  }
  
  const files = fs.readdirSync(config.distPath);
  
  for (const file of files) {
    const filePath = path.join(config.distPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      artifacts.push({
        file,
        size: stats.size,
        modified: stats.mtime,
        type: getArtifactType(file),
      });
    }
  }
  
  return artifacts;
}

/**
 * Determine artifact type based on file extension
 */
function getArtifactType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.exe':
      return filename.includes('Setup') ? 'installer' : 'executable';
    case '.dmg':
      return 'macOS installer';
    case '.appimage':
      return 'Linux AppImage';
    case '.deb':
      return 'Debian package';
    case '.rpm':
      return 'RPM package';
    case '.zip':
      return 'archive';
    case '.tar.gz':
      return 'tarball';
    default:
      return 'unknown';
  }
}

/**
 * Create build summary report
 */
function createBuildSummary(artifacts, checksums, signatures) {
  logger.info('Creating build summary...');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  const summary = {
    build: {
      version: packageJson.version,
      productName: packageJson.productName,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    artifacts: artifacts.map(artifact => ({
      ...artifact,
      checksums: checksums[artifact.file] || {},
      signature: signatures[artifact.file] || { signed: false, verified: false },
    })),
    summary: {
      totalArtifacts: artifacts.length,
      totalSize: artifacts.reduce((sum, artifact) => sum + artifact.size, 0),
      signedArtifacts: Object.values(signatures).filter(sig => sig.signed).length,
    },
  };
  
  // Write summary to JSON file
  const summaryFile = path.join(config.distPath, 'build-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  // Write human-readable summary
  const readableSummary = path.join(config.distPath, 'BUILD_SUMMARY.md');
  let content = `# PHat5 Build Summary\n\n`;
  content += `**Version:** ${summary.build.version}\n`;
  content += `**Build Date:** ${summary.build.timestamp}\n`;
  content += `**Platform:** ${summary.build.platform}\n\n`;
  
  content += `## Artifacts\n\n`;
  for (const artifact of summary.artifacts) {
    content += `### ${artifact.file}\n`;
    content += `- **Type:** ${artifact.type}\n`;
    content += `- **Size:** ${(artifact.size / 1024 / 1024).toFixed(2)} MB\n`;
    content += `- **Signed:** ${artifact.signature.signed ? '✅ Yes' : '❌ No'}\n`;
    
    if (artifact.checksums.sha256) {
      content += `- **SHA256:** \`${artifact.checksums.sha256}\`\n`;
    }
    
    content += '\n';
  }
  
  content += `## Summary\n\n`;
  content += `- **Total Artifacts:** ${summary.summary.totalArtifacts}\n`;
  content += `- **Total Size:** ${(summary.summary.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
  content += `- **Signed Artifacts:** ${summary.summary.signedArtifacts}/${summary.summary.totalArtifacts}\n`;
  
  fs.writeFileSync(readableSummary, content);
  
  logger.success(`Build summary created: ${summaryFile}`);
  logger.success(`Readable summary created: ${readableSummary}`);
  
  return summary;
}

/**
 * Main after-build processing function
 */
export default async function afterBuild(context) {
  logger.info('Starting post-build processing...');
  
  try {
    // Get build artifacts
    const artifacts = getBuildArtifacts();
    
    if (artifacts.length === 0) {
      logger.warn('No build artifacts found');
      return;
    }
    
    logger.info(`Found ${artifacts.length} build artifacts`);
    
    // Generate checksums
    let checksums = {};
    if (config.generateChecksums) {
      checksums = generateChecksums(artifacts);
    }
    
    // Verify signatures
    let signatures = {};
    if (config.verifySignatures) {
      signatures = verifySignatures(artifacts);
    }
    
    // Create build summary
    const summary = createBuildSummary(artifacts, checksums, signatures);
    
    // Log summary
    logger.info(`Build completed successfully:`);
    logger.info(`  - Version: ${summary.build.version}`);
    logger.info(`  - Artifacts: ${summary.summary.totalArtifacts}`);
    logger.info(`  - Total Size: ${(summary.summary.totalSize / 1024 / 1024).toFixed(2)} MB`);
    logger.info(`  - Signed: ${summary.summary.signedArtifacts}/${summary.summary.totalArtifacts}`);
    
    logger.success('Post-build processing completed successfully');
    
  } catch (error) {
    logger.error(`Post-build processing failed: ${error.message}`);
    throw error;
  }
}

// If called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  afterBuild()
    .then(() => {
      logger.success('After-build script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`After-build script failed: ${error.message}`);
      process.exit(1);
    });
}
