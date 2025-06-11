#!/usr/bin/env node

/**
 * Windows Code Signing Script for PHat5
 * Handles code signing for Windows executables and installers
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Certificate configuration
  certificateFile: process.env.CSC_LINK,
  certificatePassword: process.env.CSC_KEY_PASSWORD,
  
  // Signing configuration
  timestampServer: 'http://timestamp.digicert.com',
  hashAlgorithm: 'sha256',
  
  // Tool paths
  signtoolPath: process.env.SIGNTOOL_PATH || 'signtool',
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

/**
 * Logger utility
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

/**
 * Check if code signing is available and configured
 */
function isCodeSigningAvailable() {
  // Skip signing in development or if explicitly disabled
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_CODE_SIGNING === 'true') {
    logger.info('Code signing skipped (development mode or explicitly disabled)');
    return false;
  }

  // Check if certificate is available
  if (!config.certificateFile) {
    logger.warn('Code signing certificate not configured (CSC_LINK not set)');
    return false;
  }

  // Check if certificate file exists
  if (!fs.existsSync(config.certificateFile)) {
    logger.warn(`Code signing certificate file not found: ${config.certificateFile}`);
    return false;
  }

  // Check if password is provided
  if (!config.certificatePassword) {
    logger.warn('Code signing certificate password not provided (CSC_KEY_PASSWORD not set)');
    return false;
  }

  return true;
}

/**
 * Sign a file using Windows SignTool
 */
async function signFile(filePath) {
  if (!isCodeSigningAvailable()) {
    logger.info(`Skipping code signing for: ${path.basename(filePath)}`);
    return true;
  }

  logger.info(`Signing file: ${path.basename(filePath)}`);

  const signCommand = [
    config.signtoolPath,
    'sign',
    '/f', `"${config.certificateFile}"`,
    '/p', `"${config.certificatePassword}"`,
    '/t', config.timestampServer,
    '/fd', config.hashAlgorithm,
    '/v',
    `"${filePath}"`
  ].join(' ');

  let lastError = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      logger.debug(`Signing attempt ${attempt}/${config.maxRetries}`);
      logger.debug(`Command: ${signCommand.replace(config.certificatePassword, '***')}`);
      
      execSync(signCommand, { 
        stdio: 'pipe',
        timeout: 60000 // 60 second timeout
      });
      
      logger.info(`Successfully signed: ${path.basename(filePath)}`);
      return true;
      
    } catch (error) {
      lastError = error;
      logger.warn(`Signing attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < config.maxRetries) {
        logger.info(`Retrying in ${config.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }

  logger.error(`Failed to sign file after ${config.maxRetries} attempts: ${path.basename(filePath)}`);
  logger.error(`Last error: ${lastError.message}`);
  
  // Don't fail the build if signing fails, just warn
  if (process.env.REQUIRE_CODE_SIGNING === 'true') {
    throw new Error(`Code signing failed for: ${filePath}`);
  }
  
  return false;
}

/**
 * Verify a signed file
 */
function verifySignature(filePath) {
  if (!isCodeSigningAvailable()) {
    return true;
  }

  try {
    logger.info(`Verifying signature: ${path.basename(filePath)}`);
    
    const verifyCommand = [
      config.signtoolPath,
      'verify',
      '/pa',
      '/v',
      `"${filePath}"`
    ].join(' ');

    execSync(verifyCommand, { stdio: 'pipe' });
    logger.info(`Signature verified: ${path.basename(filePath)}`);
    return true;
    
  } catch (error) {
    logger.error(`Signature verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Main signing function called by electron-builder
 */
export async function sign(configuration) {
  const { path: filePath, name, hash, options } = configuration;
  
  logger.info(`Code signing request for: ${name || path.basename(filePath)}`);
  logger.debug(`File path: ${filePath}`);
  logger.debug(`Hash: ${hash}`);
  
  try {
    // Sign the file
    const signed = await signFile(filePath);
    
    // Verify the signature if signing was successful
    if (signed) {
      verifySignature(filePath);
    }
    
    return signed;
    
  } catch (error) {
    logger.error(`Code signing failed: ${error.message}`);
    
    // Re-throw if signing is required
    if (process.env.REQUIRE_CODE_SIGNING === 'true') {
      throw error;
    }
    
    return false;
  }
}

/**
 * Default export for electron-builder
 */
export default sign;

// If called directly, sign the provided file
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node sign-windows.js <file-path>');
    process.exit(1);
  }
  
  sign({ path: filePath, name: path.basename(filePath) })
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Signing failed:', error.message);
      process.exit(1);
    });
}
