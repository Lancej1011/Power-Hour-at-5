#!/usr/bin/env node

/**
 * PHat5 Release Script
 * Automates the release process for PHat5
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
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function showUsage() {
  log('\n📦 PHat5 Release Script', 'cyan');
  log('Usage: node scripts/release.js [patch|minor|major]', 'yellow');
  log('\nVersion Types:', 'bright');
  log('  patch  - Bug fixes (1.1.0 → 1.1.1)', 'reset');
  log('  minor  - New features (1.1.0 → 1.2.0)', 'reset');
  log('  major  - Breaking changes (1.1.0 → 2.0.0)', 'reset');
  log('\nExamples:', 'bright');
  log('  node scripts/release.js patch', 'reset');
  log('  node scripts/release.js minor', 'reset');
  log('  node scripts/release.js major', 'reset');
}

function main() {
  const versionType = process.argv[2];
  
  if (!versionType || !['patch', 'minor', 'major'].includes(versionType)) {
    showUsage();
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  log(`\n🚀 Starting PHat5 Release Process`, 'cyan');
  log(`Current version: ${currentVersion}`, 'yellow');

  // Step 1: Check git status
  log('\n📋 Pre-release checks...', 'magenta');
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      log('⚠️  You have uncommitted changes. Please commit or stash them first.', 'yellow');
      log('Uncommitted files:', 'reset');
      console.log(gitStatus);
      process.exit(1);
    }
    log('✅ Git working directory is clean', 'green');
  } catch (error) {
    log('❌ Git status check failed', 'red');
    process.exit(1);
  }

  // Step 2: Update version
  execCommand(`npm version ${versionType}`, `Updating version (${versionType})`);
  
  const newVersion = getCurrentVersion();
  log(`📈 Version updated: ${currentVersion} → ${newVersion}`, 'green');

  // Step 3: Push changes and tags
  execCommand('git push origin main --tags', 'Pushing changes and tags to GitHub');

  // Step 4: Build and publish
  log('\n🏗️  Building and publishing release...', 'magenta');
  log('This may take several minutes...', 'yellow');
  execCommand('npm run electron:publish', 'Building and publishing to GitHub Releases');

  // Step 5: Success message
  log('\n🎉 Release completed successfully!', 'green');
  log(`\n📦 Version ${newVersion} has been released`, 'cyan');
  log('\n📋 Next steps:', 'bright');
  log(`1. Go to: https://github.com/Lancej1011/Power-Hour-at-5/releases`, 'reset');
  log(`2. Find the draft release for v${newVersion}`, 'reset');
  log(`3. Edit the release and add release notes`, 'reset');
  log(`4. Publish the release`, 'reset');
  log('\n🔄 Users will be notified of the update automatically!', 'green');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled promise rejection: ${error.message}`, 'red');
  process.exit(1);
});

main();
