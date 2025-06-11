#!/usr/bin/env node

/**
 * PHat5 Release Preparation Script
 * Prepares the application for its first release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return null;
  }
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'magenta');
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    log(`Node.js version: ${nodeVersion}`, 'green');
  } catch (error) {
    log('❌ Node.js not found', 'red');
    return false;
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm version: ${npmVersion}`, 'green');
  } catch (error) {
    log('❌ npm not found', 'red');
    return false;
  }

  // Check git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    log(`Git version: ${gitVersion}`, 'green');
  } catch (error) {
    log('❌ Git not found', 'red');
    return false;
  }

  return true;
}

function checkGitHubToken() {
  log('\n🔑 Checking GitHub token...', 'magenta');
  
  const envFile = '.env';
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    if (envContent.includes('GH_TOKEN=') && !envContent.includes('GH_TOKEN=your_github_token_here')) {
      log('✅ GitHub token found in .env file', 'green');
      return true;
    }
  }

  log('⚠️  GitHub token not configured', 'yellow');
  log('\nTo enable automatic publishing to GitHub Releases:', 'reset');
  log('1. Go to GitHub → Settings → Developer settings → Personal access tokens', 'reset');
  log('2. Create a new token with "repo" permissions', 'reset');
  log('3. Add it to your .env file: GH_TOKEN=your_token_here', 'reset');
  log('4. Or set it as an environment variable', 'reset');
  
  return false;
}

function main() {
  log('🚀 PHat5 Release Preparation', 'cyan');
  log('This script will prepare your application for release\n', 'reset');

  // Check prerequisites
  if (!checkPrerequisites()) {
    log('\n❌ Prerequisites not met. Please install missing tools.', 'red');
    process.exit(1);
  }

  // Check GitHub token
  const hasToken = checkGitHubToken();

  // Install dependencies
  execCommand('npm install', 'Installing dependencies');

  // Build the application
  execCommand('npm run build', 'Building application');

  // Test electron build
  log('\n🧪 Testing electron build...', 'magenta');
  const buildResult = execCommand('npm run electron:pack', 'Creating test build');
  
  if (buildResult !== null) {
    log('✅ Electron build test successful', 'green');
  } else {
    log('❌ Electron build test failed', 'red');
    log('Please fix build issues before releasing', 'yellow');
    process.exit(1);
  }

  // Success message
  log('\n🎉 Release preparation completed!', 'green');
  log('\n📋 Your application is ready for release', 'cyan');
  
  if (hasToken) {
    log('\n🚀 Ready to release:', 'bright');
    log('  npm run release:patch   # For bug fixes', 'reset');
    log('  npm run release:minor   # For new features', 'reset');
    log('  npm run release:major   # For breaking changes', 'reset');
  } else {
    log('\n⚠️  To enable automatic publishing:', 'yellow');
    log('1. Set up GitHub token (see instructions above)', 'reset');
    log('2. Then run: npm run release:patch (or minor/major)', 'reset');
  }

  log('\n📚 For detailed instructions, see: RELEASE_PROCESS.md', 'blue');
}

main();
