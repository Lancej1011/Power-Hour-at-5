/**
 * macOS Notarization Script for PHat5
 * Handles code signing and notarization for macOS builds
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not a macOS build');
    return;
  }

  // Check if we have the required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️ Skipping notarization - missing required environment variables:');
    console.warn('   APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID');
    console.warn('   Set these environment variables to enable notarization');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🍎 Notarizing ${appName} at ${appPath}`);
  console.log(`   Apple ID: ${appleId}`);
  console.log(`   Team ID: ${teamId}`);

  try {
    await notarize({
      appBundleId: 'com.phat5.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log('✅ Notarization completed successfully');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};

// Alternative notarization using app-specific password
exports.notarizeWithAppPassword = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appPassword = process.env.APPLE_APP_PASSWORD; // App-specific password
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appPassword || !teamId) {
    console.warn('⚠️ Skipping app-password notarization - missing environment variables');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🍎 Notarizing with app-specific password: ${appName}`);

  try {
    await notarize({
      appBundleId: 'com.phat5.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appPassword,
      teamId: teamId,
    });

    console.log('✅ App-password notarization completed successfully');
  } catch (error) {
    console.error('❌ App-password notarization failed:', error);
    throw error;
  }
};

// Keychain-based notarization
exports.notarizeWithKeychain = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const keychainProfile = process.env.APPLE_KEYCHAIN_PROFILE || 'AC_PASSWORD';
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !teamId) {
    console.warn('⚠️ Skipping keychain notarization - missing environment variables');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`🍎 Notarizing with keychain profile: ${appName}`);
  console.log(`   Keychain profile: ${keychainProfile}`);

  try {
    await notarize({
      appBundleId: 'com.phat5.app',
      appPath: appPath,
      appleId: appleId,
      keychainProfile: keychainProfile,
      teamId: teamId,
    });

    console.log('✅ Keychain notarization completed successfully');
  } catch (error) {
    console.error('❌ Keychain notarization failed:', error);
    throw error;
  }
};
