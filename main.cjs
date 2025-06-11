const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require('electron');

// Try to load electron-updater, but don't fail if it's not available
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
  console.log('electron-updater not available, auto-updates disabled');
}
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

// Simple logger for main process
const logger = {
  debug: (message, data = {}, component = 'Main') => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${component}] ${message}`, data);
    }
  },
  info: (message, data = {}, component = 'Main') => {
    console.log(`[INFO] [${component}] ${message}`, data);
  },
  warn: (message, data = {}, component = 'Main') => {
    console.warn(`[WARN] [${component}] ${message}`, data);
  },
  error: (message, data = {}, component = 'Main') => {
    console.error(`[ERROR] [${component}] ${message}`, data);
  }
};

// Auto-updater configuration
if (autoUpdater) {
  autoUpdater.logger = logger;
  autoUpdater.autoDownload = false; // Don't auto-download, let user choose
  autoUpdater.autoInstallOnAppQuit = false; // Don't auto-install, let user choose
  autoUpdater.allowPrerelease = false; // Only stable releases by default
  autoUpdater.allowDowngrade = false; // Don't allow downgrades
  autoUpdater.disableWebInstaller = false; // Allow web installer fallback

  // Configure update server
  if (process.env.NODE_ENV === 'production') {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Lancej1011',
      repo: 'Power-Hour-at-5',
      private: false,
      releaseType: 'release' // Only stable releases
    });
  }

  // Set update check interval (24 hours)
  autoUpdater.checkForUpdatesAndNotify();
}

// Default paths
const DEFAULT_APP_DATA_FOLDER = path.join(app.getPath('userData'), 'PowerHour');
const DEFAULT_MIX_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'mixes');
const DEFAULT_TEMP_CLIPS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'temp_clips');
const DEFAULT_TEMP_SONGS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'temp_songs');
const DEFAULT_BACKUP_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'backups');
const DEFAULT_PROJECTS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'projects');
const DEFAULT_PLAYLISTS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'playlists');
const DEFAULT_CLIPS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'clips');
let mixFolder = null;
let libraryFolder = null;
let mainWindow = null;

const SUPPORTED_AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

// Ensure default folders exist
function ensureDefaultFolders() {
  // Ensure app data folder exists
  if (!fs.existsSync(DEFAULT_APP_DATA_FOLDER)) {
    fs.mkdirSync(DEFAULT_APP_DATA_FOLDER, { recursive: true });
  }

  // Ensure mix folder exists
  if (!fs.existsSync(DEFAULT_MIX_FOLDER)) {
    fs.mkdirSync(DEFAULT_MIX_FOLDER, { recursive: true });
  }

  // Ensure temp clips folder exists
  if (!fs.existsSync(DEFAULT_TEMP_CLIPS_FOLDER)) {
    fs.mkdirSync(DEFAULT_TEMP_CLIPS_FOLDER, { recursive: true });
  }

  // Ensure temp songs folder exists
  if (!fs.existsSync(DEFAULT_TEMP_SONGS_FOLDER)) {
    fs.mkdirSync(DEFAULT_TEMP_SONGS_FOLDER, { recursive: true });
  }

  // Ensure backup folder exists
  if (!fs.existsSync(DEFAULT_BACKUP_FOLDER)) {
    fs.mkdirSync(DEFAULT_BACKUP_FOLDER, { recursive: true });
  }

  // Ensure projects folder exists
  if (!fs.existsSync(DEFAULT_PROJECTS_FOLDER)) {
    fs.mkdirSync(DEFAULT_PROJECTS_FOLDER, { recursive: true });
  }

  // Ensure playlists folder exists
  if (!fs.existsSync(DEFAULT_PLAYLISTS_FOLDER)) {
    fs.mkdirSync(DEFAULT_PLAYLISTS_FOLDER, { recursive: true });
  }

  // Ensure clips folder exists (for permanent clip storage)
  if (!fs.existsSync(DEFAULT_CLIPS_FOLDER)) {
    fs.mkdirSync(DEFAULT_CLIPS_FOLDER, { recursive: true });
  }
}

// Save the library folder path to a config file
const saveLibraryFolder = (folder) => {
  try {
    ensureDefaultFolders();
    const configPath = path.join(DEFAULT_APP_DATA_FOLDER, 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {
        // Default to empty config
      }
    }
    config.libraryFolder = folder;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to save library folder', { error });
  }
};

// Load config
const loadConfig = () => {
  try {
    ensureDefaultFolders();
    const configPath = path.join(DEFAULT_APP_DATA_FOLDER, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config;
    }
  } catch (error) {
    logger.error('Failed to load config', { error });
  }
  return {};
};

// Load library folder from config
const loadLibraryFolder = () => {
  const config = loadConfig();
  libraryFolder = config.libraryFolder || null;
};

// Load mix folder
const loadMixFolder = () => {
  ensureDefaultFolders();
  mixFolder = DEFAULT_MIX_FOLDER;
};

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove standard window frame
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  });

  // Load your React app - check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(path.join(__dirname, 'dist', 'index.html'));

  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');

    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Handle window control IPC events
  ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow.close();
  });

  // Add IPC handler to open developer tools
  ipcMain.handle('open-dev-tools', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Register global shortcut for developer tools
  globalShortcut.register('F12', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Also register Ctrl+Shift+I as an alternative
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
}

app.whenReady().then(() => {
  // Load mix folder before creating window
  loadMixFolder();
  loadLibraryFolder();
  createWindow();

  // Initialize auto-updater in production
  if (process.env.NODE_ENV === 'production') {
    setupAutoUpdater();
  }
});

// Auto-updater setup and event handlers
function setupAutoUpdater() {
  if (!autoUpdater) {
    logger.info('Auto-updater not available, skipping setup');
    return;
  }

  logger.info('Setting up auto-updater');

  // Load update settings
  const updateSettings = loadConfig();

  // Configure auto-updater based on settings
  autoUpdater.allowPrerelease = updateSettings.allowPrerelease || false;
  autoUpdater.autoDownload = updateSettings.autoDownloadUpdates || false;
  autoUpdater.autoInstallOnAppQuit = updateSettings.autoInstallUpdates || false;

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for update...');
    if (mainWindow) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available:', info);

    // Check if update is postponed
    const config = loadConfig();
    const postponedUntil = config.updatePostponedUntil;
    if (postponedUntil && new Date(postponedUntil) > new Date()) {
      logger.info('Update postponed until:', postponedUntil);
      return;
    }

    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        size: info.files?.[0]?.size,
        currentVersion: app.getVersion(),
        isPrerelease: info.prerelease || false,
        downloadUrl: info.files?.[0]?.url
      });
    }

    // Add to update history
    addUpdateHistoryEntry({
      type: 'update-available',
      version: info.version,
      currentVersion: app.getVersion(),
      size: info.files?.[0]?.size
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('Update not available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', {
        currentVersion: app.getVersion(),
        checkedVersion: info.version
      });
    }
  });

  autoUpdater.on('error', (err) => {
    logger.error('Update error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
    }

    // Add to update history
    addUpdateHistoryEntry({
      type: 'update-error',
      error: err.message,
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    logger.info('Download progress:', Math.round(progressObj.percent) + '%');
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: Math.round(progressObj.percent * 100) / 100,
        transferred: progressObj.transferred,
        total: progressObj.total,
        transferredFormatted: formatBytes(progressObj.transferred),
        totalFormatted: formatBytes(progressObj.total),
        speedFormatted: formatBytes(progressObj.bytesPerSecond) + '/s',
        eta: calculateETA(progressObj.transferred, progressObj.total, progressObj.bytesPerSecond)
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        currentVersion: app.getVersion(),
        downloadPath: info.downloadedFile
      });
    }

    // Add to update history
    addUpdateHistoryEntry({
      type: 'update-downloaded',
      version: info.version,
      currentVersion: app.getVersion()
    });

    // Auto-install if enabled
    const config = loadConfig();
    if (config.autoInstallUpdates) {
      setTimeout(() => {
        autoUpdater.quitAndInstall();
      }, 5000); // Give user 5 seconds to cancel
    }
  });

  // Schedule periodic update checks
  scheduleUpdateChecks();
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to calculate ETA
function calculateETA(transferred, total, bytesPerSecond) {
  if (bytesPerSecond === 0) return 'Unknown';
  const remaining = total - transferred;
  const seconds = Math.round(remaining / bytesPerSecond);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

// Helper function to add update history entry
async function addUpdateHistoryEntry(entry) {
  try {
    ensureDefaultFolders();
    const historyFile = path.join(DEFAULT_APP_DATA_FOLDER, 'update-history.json');

    let history = [];
    if (fs.existsSync(historyFile)) {
      try {
        const data = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(data);
      } catch (e) {
        // Start with empty history if file is corrupted
      }
    }

    // Add new entry
    history.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });

    // Keep only last 50 entries
    history = history.slice(0, 50);

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    logger.error('Failed to add update history entry:', error);
  }
}

// Schedule periodic update checks
function scheduleUpdateChecks() {
  const config = loadConfig();

  if (!config.autoCheckUpdates) {
    logger.info('Automatic update checks disabled');
    return;
  }

  const checkInterval = (config.updateCheckInterval || 24) * 60 * 60 * 1000; // Convert hours to milliseconds

  // Check immediately if it's been more than the interval since last check
  const lastCheck = config.lastUpdateCheck;
  if (!lastCheck || (new Date() - new Date(lastCheck)) > checkInterval) {
    setTimeout(() => {
      if (autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    }, 30000); // Wait 30 seconds after startup
  }

  // Schedule regular checks
  setInterval(() => {
    if (autoUpdater && config.autoCheckUpdates) {
      logger.info('Performing scheduled update check');
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, checkInterval);
}

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    if (!autoUpdater) {
      return { available: false, message: 'Auto-updater not available' };
    }

    if (process.env.NODE_ENV !== 'production') {
      return { available: false, message: 'Updates disabled in development' };
    }

    const result = await autoUpdater.checkForUpdates();
    return {
      available: result?.updateInfo ? true : false,
      version: result?.updateInfo?.version,
      releaseDate: result?.updateInfo?.releaseDate,
      releaseNotes: result?.updateInfo?.releaseNotes,
      size: result?.updateInfo?.files?.[0]?.size
    };
  } catch (error) {
    logger.error('Check for updates failed:', error);
    throw error;
  }
});

ipcMain.handle('download-update', async () => {
  try {
    if (!autoUpdater) {
      throw new Error('Auto-updater not available');
    }

    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Updates disabled in development');
    }

    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    logger.error('Download update failed:', error);
    throw error;
  }
});

ipcMain.handle('install-update', async () => {
  try {
    if (!autoUpdater) {
      throw new Error('Auto-updater not available');
    }

    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Updates disabled in development');
    }

    // This will quit and install the update
    autoUpdater.quitAndInstall();
    return true;
  } catch (error) {
    logger.error('Install update failed:', error);
    throw error;
  }
});

ipcMain.handle('get-current-version', () => {
  return app.getVersion();
});

// Enhanced auto-updater IPC handlers
ipcMain.handle('get-update-settings', async () => {
  try {
    const config = loadConfig();
    return {
      autoCheck: config.autoCheckUpdates !== false, // Default to true
      checkInterval: config.updateCheckInterval || 24, // Hours
      allowPrerelease: config.allowPrerelease || false,
      autoDownload: config.autoDownloadUpdates || false,
      autoInstall: config.autoInstallUpdates || false,
      lastCheck: config.lastUpdateCheck || null,
      updateChannel: config.updateChannel || 'stable'
    };
  } catch (error) {
    logger.error('Failed to get update settings:', error);
    return {
      autoCheck: true,
      checkInterval: 24,
      allowPrerelease: false,
      autoDownload: false,
      autoInstall: false,
      lastCheck: null,
      updateChannel: 'stable'
    };
  }
});

ipcMain.handle('set-update-settings', async (event, settings) => {
  try {
    const config = loadConfig();

    // Update configuration
    config.autoCheckUpdates = settings.autoCheck;
    config.updateCheckInterval = settings.checkInterval;
    config.allowPrerelease = settings.allowPrerelease;
    config.autoDownloadUpdates = settings.autoDownload;
    config.autoInstallUpdates = settings.autoInstall;
    config.updateChannel = settings.updateChannel;

    // Save configuration
    ensureDefaultFolders();
    const configPath = path.join(DEFAULT_APP_DATA_FOLDER, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Update auto-updater settings
    if (autoUpdater) {
      autoUpdater.allowPrerelease = settings.allowPrerelease;
      autoUpdater.autoDownload = settings.autoDownload;
      autoUpdater.autoInstallOnAppQuit = settings.autoInstall;
    }

    logger.info('Update settings saved:', settings);
    return true;
  } catch (error) {
    logger.error('Failed to save update settings:', error);
    return false;
  }
});

ipcMain.handle('check-for-updates-manual', async () => {
  try {
    if (!autoUpdater) {
      return { available: false, message: 'Auto-updater not available' };
    }

    if (process.env.NODE_ENV !== 'production') {
      return { available: false, message: 'Updates disabled in development' };
    }

    // Update last check time
    const config = loadConfig();
    config.lastUpdateCheck = new Date().toISOString();
    const configPath = path.join(DEFAULT_APP_DATA_FOLDER, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const result = await autoUpdater.checkForUpdates();
    return {
      available: result?.updateInfo ? true : false,
      version: result?.updateInfo?.version,
      releaseDate: result?.updateInfo?.releaseDate,
      releaseNotes: result?.updateInfo?.releaseNotes,
      size: result?.updateInfo?.files?.[0]?.size,
      currentVersion: app.getVersion(),
      checkTime: config.lastUpdateCheck
    };
  } catch (error) {
    logger.error('Manual update check failed:', error);
    throw error;
  }
});

ipcMain.handle('cancel-update-download', async () => {
  try {
    if (!autoUpdater) {
      throw new Error('Auto-updater not available');
    }

    // Note: electron-updater doesn't have a direct cancel method
    // We can only prevent installation after download
    logger.info('Update download cancellation requested');
    return true;
  } catch (error) {
    logger.error('Cancel update download failed:', error);
    throw error;
  }
});

ipcMain.handle('postpone-update', async (event, postponeUntil) => {
  try {
    const config = loadConfig();
    config.updatePostponedUntil = postponeUntil;

    const configPath = path.join(DEFAULT_APP_DATA_FOLDER, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    logger.info('Update postponed until:', postponeUntil);
    return true;
  } catch (error) {
    logger.error('Failed to postpone update:', error);
    return false;
  }
});

ipcMain.handle('get-update-history', async () => {
  try {
    const historyFile = path.join(DEFAULT_APP_DATA_FOLDER, 'update-history.json');
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    logger.error('Failed to load update history:', error);
    return [];
  }
});

ipcMain.handle('add-update-history-entry', async (event, entry) => {
  try {
    ensureDefaultFolders();
    const historyFile = path.join(DEFAULT_APP_DATA_FOLDER, 'update-history.json');

    let history = [];
    if (fs.existsSync(historyFile)) {
      try {
        const data = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(data);
      } catch (e) {
        // Start with empty history if file is corrupted
      }
    }

    // Add new entry
    history.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });

    // Keep only last 50 entries
    history = history.slice(0, 50);

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    return true;
  } catch (error) {
    logger.error('Failed to add update history entry:', error);
    return false;
  }
});

// Version management IPC handlers
const VERSION_HISTORY_FILE = path.join(DEFAULT_APP_DATA_FOLDER, 'version-history.json');
const BACKUPS_FOLDER = path.join(DEFAULT_APP_DATA_FOLDER, 'version-backups');

// Ensure backups folder exists
function ensureBackupsFolder() {
  if (!fs.existsSync(BACKUPS_FOLDER)) {
    fs.mkdirSync(BACKUPS_FOLDER, { recursive: true });
  }
}

ipcMain.handle('get-version-history', async () => {
  try {
    if (fs.existsSync(VERSION_HISTORY_FILE)) {
      const data = fs.readFileSync(VERSION_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    logger.error('Failed to load version history:', error);
    return [];
  }
});

ipcMain.handle('save-version-history', async (event, history) => {
  try {
    ensureDefaultFolders();
    fs.writeFileSync(VERSION_HISTORY_FILE, JSON.stringify(history, null, 2));
    return true;
  } catch (error) {
    logger.error('Failed to save version history:', error);
    return false;
  }
});

ipcMain.handle('create-version-backup', async (event, version) => {
  try {
    ensureBackupsFolder();

    const backupFolder = path.join(BACKUPS_FOLDER, version);
    const appPath = process.execPath;
    const appDir = path.dirname(appPath);

    // Create backup folder
    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }

    // Copy current executable and resources
    const backupExePath = path.join(backupFolder, path.basename(appPath));
    fs.copyFileSync(appPath, backupExePath);

    // Get backup size
    const stats = fs.statSync(backupExePath);

    logger.info(`Created backup for version ${version} at ${backupFolder}`);

    return {
      version,
      backupPath: backupFolder,
      backupDate: new Date().toISOString(),
      size: stats.size
    };
  } catch (error) {
    logger.error(`Failed to create backup for version ${version}:`, error);
    return null;
  }
});

ipcMain.handle('rollback-to-version', async (event, version, backupPath) => {
  try {
    logger.info(`Attempting rollback to version ${version} from ${backupPath}`);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup path does not exist: ${backupPath}`);
    }

    const backupExePath = path.join(backupPath, path.basename(process.execPath));
    if (!fs.existsSync(backupExePath)) {
      throw new Error(`Backup executable not found: ${backupExePath}`);
    }

    // Create a script to replace the current executable after app closes
    const scriptPath = path.join(BACKUPS_FOLDER, 'rollback.bat');
    const currentExePath = process.execPath;

    const rollbackScript = `
@echo off
timeout /t 2 /nobreak > nul
copy "${backupExePath}" "${currentExePath}" /y
start "" "${currentExePath}"
del "%~f0"
`;

    fs.writeFileSync(scriptPath, rollbackScript);

    // Execute rollback script and quit
    const { spawn } = require('child_process');
    spawn('cmd', ['/c', scriptPath], {
      detached: true,
      stdio: 'ignore'
    }).unref();

    // Quit the app to allow rollback
    setTimeout(() => {
      app.quit();
    }, 1000);

    return true;
  } catch (error) {
    logger.error(`Rollback to version ${version} failed:`, error);
    return false;
  }
});

ipcMain.handle('delete-version-backup', async (event, backupPath) => {
  try {
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
      logger.info(`Deleted version backup: ${backupPath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to delete version backup ${backupPath}:`, error);
    return false;
  }
});

// Always return the default mix folder
ipcMain.handle('get-mix-folder', () => {
  return mixFolder;
});

// Always use the default mix folder, create it if it doesn't exist
ipcMain.handle('select-mix-folder', async () => {
  if (!fs.existsSync(DEFAULT_MIX_FOLDER)) {
    fs.mkdirSync(DEFAULT_MIX_FOLDER, { recursive: true });
  }
  mixFolder = DEFAULT_MIX_FOLDER;
  return mixFolder;
});

ipcMain.handle('save-mix', async (event, mix, buffer) => {
  try {
    if (!mixFolder) {
      logger.warn('No mixFolder set, using default', { defaultFolder: DEFAULT_MIX_FOLDER });
      mixFolder = DEFAULT_MIX_FOLDER;
    }

    // Check if folder exists, create if needed
    if (!fs.existsSync(mixFolder)) {
      logger.info('Creating mix folder', { mixFolder });
      fs.mkdirSync(mixFolder, { recursive: true });
    }

    logger.info('Saving mix', { mixName: mix.name, mixFolder });
    const filePath = path.join(mixFolder, `${mix.id || mix.name}.wav`);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    const metaFilePath = path.join(mixFolder, `${mix.id || mix.name}.json`);
    fs.writeFileSync(metaFilePath, JSON.stringify(mix, null, 2));
    logger.info('Successfully saved mix files', { wav: filePath, json: metaFilePath });

    return true;
  } catch (error) {
    logger.error('Error saving mix', { error });
    return false;
  }
});

ipcMain.handle('list-mixes', async () => {
  try {
    if (!mixFolder) {
      console.log('No mixFolder set, using default');
      mixFolder = DEFAULT_MIX_FOLDER;
    }

    // Check if folder exists
    if (!fs.existsSync(mixFolder)) {
      console.log('Mix folder does not exist, creating:', mixFolder);
      fs.mkdirSync(mixFolder, { recursive: true });
      return [];
    }

    console.log('Listing mixes from folder:', mixFolder);
    const files = fs.readdirSync(mixFolder);
    console.log('Files in mix folder:', files);

    const mixes = files.filter(f => f.endsWith('.json')).map(f => {
      try {
        const data = fs.readFileSync(path.join(mixFolder, f));
        const mix = JSON.parse(data);

        // Add the file path for playback
        const baseName = f.replace('.json', '');
        const wavPath = path.join(mixFolder, `${baseName}.wav`);
        mix.localFilePath = wavPath;

        console.log(`Loaded mix: ${mix.name} (${f})`);
        return mix;
      } catch (err) {
        console.error(`Error parsing JSON file ${f}:`, err);
        return null;
      }
    }).filter(Boolean); // Filter out any null values

    return mixes;
  } catch (error) {
    console.error('Error listing mixes:', error);
    return [];
  }
});

// Add handler for deleting a mix
ipcMain.handle('delete-mix', async (event, mix) => {
  if (!mixFolder) return false;
  try {
    console.log('Deleting mix:', mix);

    // Try deleting by both ID and name to ensure complete removal
    // Possible file patterns to try (both .json and .wav)
    const possibleFiles = [
      // Try by id
      { json: path.join(mixFolder, `${mix.id}.json`), wav: path.join(mixFolder, `${mix.id}.wav`) },
      // Try by name
      { json: path.join(mixFolder, `${mix.name}.json`), wav: path.join(mixFolder, `${mix.name}.wav`) }
    ];

    let deletedAnyFile = false;

    // Try to delete all possible file combinations
    for (const files of possibleFiles) {
      console.log('Checking for files to delete:', files);

      // Delete JSON file if it exists
      if (fs.existsSync(files.json)) {
        console.log('Deleting JSON file:', files.json);
        fs.unlinkSync(files.json);
        deletedAnyFile = true;
      }

      // Delete WAV file if it exists
      if (fs.existsSync(files.wav)) {
        console.log('Deleting WAV file:', files.wav);
        fs.unlinkSync(files.wav);
        deletedAnyFile = true;
      }
    }

    // Also try to delete backup folder for this mix if it exists
    const possibleBackupFolders = [
      path.join(DEFAULT_BACKUP_FOLDER, mix.id),
      path.join(DEFAULT_BACKUP_FOLDER, mix.name)
    ];

    for (const backupFolder of possibleBackupFolders) {
      if (fs.existsSync(backupFolder)) {
        try {
          // Delete the folder and all contents recursively
          fs.rmSync(backupFolder, { recursive: true, force: true });
          console.log('Deleted backup folder:', backupFolder);
          deletedAnyFile = true;
        } catch (err) {
          console.error('Error deleting backup folder:', err);
        }
      }
    }

    return deletedAnyFile; // Return true if we deleted at least one file
  } catch (error) {
    console.error('Error deleting mix:', error);
    return false;
  }
});

// Add handler for renaming a mix
ipcMain.handle('rename-mix', async (event, mix, newName) => {
  if (!mixFolder) return false;
  try {
    const oldJsonPath = path.join(mixFolder, `${mix.name}.json`);
    const oldWavPath = path.join(mixFolder, `${mix.name}.wav`);
    const newJsonPath = path.join(mixFolder, `${newName}.json`);
    const newWavPath = path.join(mixFolder, `${newName}.wav`);

    // Rename the files
    if (fs.existsSync(oldJsonPath)) {
      // Update the JSON content with the new name
      const mixData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));
      mixData.name = newName;

      // Write to the new file
      fs.writeFileSync(newJsonPath, JSON.stringify(mixData, null, 2));

      // Delete old file
      fs.unlinkSync(oldJsonPath);
    }

    if (fs.existsSync(oldWavPath)) {
      fs.renameSync(oldWavPath, newWavPath);
    }

    return true;
  } catch (error) {
    console.error('Error renaming mix:', error);
    return false;
  }
});

// Add handler to get a WAV file path for a mix for playback
ipcMain.handle('get-mix-file-path', async (event, mixName) => {
  if (!mixFolder) return null;
  const wavPath = path.join(mixFolder, `${mixName}.wav`);
  if (fs.existsSync(wavPath)) {
    return wavPath;
  }
  return null;
});

// IPC: Select library folder (just returns the selected folder, doesn't set it as current)
ipcMain.handle('select-library-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!canceled && filePaths.length > 0) {
    // Just return the selected folder, don't set it as current
    return filePaths[0];
  }
  return null;
});

// IPC: Get current library folder
ipcMain.handle('get-library-folder', () => {
  if (!libraryFolder) loadLibraryFolder();
  return libraryFolder;
});

// IPC: Set current library folder
ipcMain.handle('set-library-folder', (event, folderPath) => {
  libraryFolder = folderPath;
  if (folderPath) {
    saveLibraryFolder(folderPath);
  }
  console.log(`Library folder set to: ${folderPath}`);
  return folderPath;
});

// Metadata cache to avoid re-parsing files
const metadataCache = new Map();
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper: Get cached metadata or parse if not cached
async function getCachedMetadata(filePath, stats) {
  const cacheKey = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;

  if (metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.metadata;
    }
    metadataCache.delete(cacheKey);
  }

  let meta = { title: '', artist: '', album: '', genre: '', year: '' };
  try {
    const metadata = await mm.parseFile(filePath, { duration: false });
    meta.title = metadata.common.title || '';
    meta.artist = Array.isArray(metadata.common.artist) ? metadata.common.artist.join(', ') : (metadata.common.artist || '');
    meta.album = metadata.common.album || '';
    meta.genre = Array.isArray(metadata.common.genre) ? metadata.common.genre.join(', ') : (metadata.common.genre || '');
    meta.year = metadata.common.year ? String(metadata.common.year) : '';

    // Cache the result
    metadataCache.set(cacheKey, {
      metadata: meta,
      timestamp: Date.now()
    });
  } catch (err) {
    // Ignore metadata errors, fallback to filename
  }

  return meta;
}

// Helper: Recursively get all audio files in a directory, with metadata (optimized)
async function getAllAudioFilesWithMetadata(dir, progressCallback = null, cancelToken = { cancelled: false }) {
  let results = [];
  let processedCount = 0;

  try {
    const list = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of list) {
      if (cancelToken.cancelled) {
        throw new Error('Operation cancelled');
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subResults = await getAllAudioFilesWithMetadata(fullPath, progressCallback, cancelToken);
        results = results.concat(subResults);
      } else if (SUPPORTED_AUDIO_EXTS.includes(path.extname(entry.name).toLowerCase())) {
        try {
          const stats = await fs.promises.stat(fullPath);
          const meta = await getCachedMetadata(fullPath, stats);

          results.push({
            name: entry.name,
            path: fullPath,
            title: meta.title,
            artist: meta.artist,
            album: meta.album,
            genre: meta.genre,
            year: meta.year,
            fileSize: stats.size,
            lastModified: stats.mtime.getTime(),
          });

          processedCount++;
          if (progressCallback && processedCount % 10 === 0) {
            progressCallback({ processed: processedCount, current: entry.name });
          }
        } catch (err) {
          console.error(`Error processing file ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    if (err.message === 'Operation cancelled') {
      throw err;
    }
    console.error(`Error reading directory ${dir}:`, err);
  }

  return results;
}

// Global cancel token for library loading
let libraryCancelToken = { cancelled: false };

// IPC: List audio files in library folder (recursive, with metadata)
ipcMain.handle('list-library-audio', async (event) => {
  if (!libraryFolder) return [];

  // Reset cancel token for new operation
  libraryCancelToken = { cancelled: false };

  try {
    const progressCallback = (progress) => {
      event.sender.send('library-load-progress', progress);
    };

    return await getAllAudioFilesWithMetadata(libraryFolder, progressCallback, libraryCancelToken);
  } catch (err) {
    if (err.message === 'Operation cancelled') {
      console.log('Library loading cancelled');
      return [];
    }
    console.error('Error reading library folder:', err);
    return [];
  }
});

// IPC: List audio files in any specified folder (recursive, with metadata)
ipcMain.handle('scan-folder-audio', async (event, folderPath) => {
  if (!folderPath) return [];

  // Reset cancel token for new operation
  libraryCancelToken = { cancelled: false };

  try {
    const progressCallback = (progress) => {
      event.sender.send('library-load-progress', progress);
    };

    console.log(`Scanning folder: ${folderPath}`);
    return await getAllAudioFilesWithMetadata(folderPath, progressCallback, libraryCancelToken);
  } catch (err) {
    if (err.message === 'Operation cancelled') {
      console.log('Folder scanning cancelled');
      return [];
    }
    console.error('Error reading folder:', folderPath, err);
    return [];
  }
});

// IPC: Cancel library loading
ipcMain.handle('cancel-library-loading', async () => {
  libraryCancelToken.cancelled = true;
  return true;
});

// Handler to get a file as a Buffer for Blob usage
ipcMain.handle('get-file-blob', async (_event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } catch (error) {
    console.error('Error reading file as blob:', error);
    throw error;
  }
});

// If your platform isn't Darwin (macOS), exit the app when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up global shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers for temporary clips
ipcMain.handle('save-temp-clip', async (event, clipMeta, buffer) => {
  try {
    ensureDefaultFolders();

    // Validate inputs
    if (!clipMeta || !clipMeta.id) {
      console.error('Invalid clip metadata provided');
      return false;
    }

    if (!buffer || buffer === null) {
      console.error('Invalid buffer provided - buffer is null or undefined');
      return false;
    }

    // Save the WAV file
    const wavPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clipMeta.id}.wav`);
    fs.writeFileSync(wavPath, Buffer.from(buffer));

    // Save the metadata separately
    const metaPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clipMeta.id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(clipMeta, null, 2));

    return true;
  } catch (error) {
    console.error('Error saving temp clip:', error);
    return false;
  }
});

ipcMain.handle('list-temp-clips', async () => {
  try {
    ensureDefaultFolders();

    const files = fs.readdirSync(DEFAULT_TEMP_CLIPS_FOLDER);
    const clipMetaFiles = files.filter(f => f.endsWith('.json'));

    const clips = [];
    for (const metaFile of clipMetaFiles) {
      const metaPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, metaFile);
      const wavPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, metaFile.replace('.json', '.wav'));

      if (fs.existsSync(wavPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          clips.push({
            ...meta,
            wavPath
          });
        } catch (err) {
          console.error(`Error parsing clip metadata ${metaFile}:`, err);
        }
      }
    }

    return clips;
  } catch (error) {
    console.error('Error listing temp clips:', error);
    return [];
  }
});

ipcMain.handle('get-temp-clip', async (event, clipId) => {
  try {
    const wavPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clipId}.wav`);
    if (fs.existsSync(wavPath)) {
      const data = fs.readFileSync(wavPath);
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    return null;
  } catch (error) {
    console.error('Error getting temp clip:', error);
    return null;
  }
});

ipcMain.handle('delete-temp-clip', async (event, clipId) => {
  try {
    const wavPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clipId}.wav`);
    const metaPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clipId}.json`);

    if (fs.existsSync(wavPath)) {
      fs.unlinkSync(wavPath);
    }

    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    return true;
  } catch (error) {
    console.error('Error deleting temp clip:', error);
    return false;
  }
});

ipcMain.handle('clear-temp-clips', async () => {
  try {
    ensureDefaultFolders();

    const files = fs.readdirSync(DEFAULT_TEMP_CLIPS_FOLDER);
    for (const file of files) {
      fs.unlinkSync(path.join(DEFAULT_TEMP_CLIPS_FOLDER, file));
    }

    return true;
  } catch (error) {
    console.error('Error clearing temp clips:', error);
    return false;
  }
});

// IPC handlers for temporary songs
ipcMain.handle('save-temp-song', async (event, songMeta, buffer) => {
  try {
    ensureDefaultFolders();

    // Validate inputs
    if (!songMeta || !songMeta.id) {
      console.error('Invalid song metadata provided');
      return false;
    }

    if (!buffer || buffer === null) {
      console.error('Invalid buffer provided - buffer is null or undefined');
      return false;
    }

    // Save the audio file with appropriate extension
    const extension = path.extname(songMeta.originalName || 'song.mp3');
    const audioPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songMeta.id}${extension}`);
    fs.writeFileSync(audioPath, Buffer.from(buffer));

    // Save the metadata separately, including the file extension
    const metaPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songMeta.id}.json`);
    const metaWithExt = {
      ...songMeta,
      fileExtension: extension
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaWithExt, null, 2));

    // Check if this song should also be added to the library
    if (songMeta.addToLibrary && songMeta.targetFolder) {
      try {
        const libraryFolder = songMeta.targetFolder;

        // Make sure the library folder exists
        if (!fs.existsSync(libraryFolder)) {
          fs.mkdirSync(libraryFolder, { recursive: true });
        }

        // Create a good filename for the library using metadata
        let filename = songMeta.originalName;

        // If we have artist and name, create a better filename
        if (songMeta.artist && songMeta.name) {
          // Remove any invalid characters from the artist and name
          const safeArtist = songMeta.artist.replace(/[\\/:*?"<>|]/g, '_');
          const safeName = songMeta.name.replace(/[\\/:*?"<>|]/g, '_');
          filename = `${safeArtist} - ${safeName}${extension}`;
        }

        // Copy the file to the library folder
        const libraryPath = path.join(libraryFolder, filename);
        fs.copyFileSync(audioPath, libraryPath);

        console.log(`Added song to library: ${libraryPath}`);
      } catch (error) {
        console.error('Error adding song to library:', error);
        // Continue even if library add fails - the temp save still worked
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving temp song:', error);
    return false;
  }
});

ipcMain.handle('list-temp-songs', async () => {
  try {
    ensureDefaultFolders();

    const files = fs.readdirSync(DEFAULT_TEMP_SONGS_FOLDER);
    const songMetaFiles = files.filter(f => f.endsWith('.json'));

    const songs = [];
    for (const metaFile of songMetaFiles) {
      const metaPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, metaFile);

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const songId = metaFile.replace('.json', '');
        const audioPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songId}${meta.fileExtension || '.mp3'}`);

        if (fs.existsSync(audioPath)) {
          songs.push({
            ...meta,
            path: audioPath
          });
        }
      } catch (err) {
        console.error(`Error parsing song metadata ${metaFile}:`, err);
      }
    }

    return songs;
  } catch (error) {
    console.error('Error listing temp songs:', error);
    return [];
  }
});

ipcMain.handle('get-temp-song', async (event, songId, extension = '.mp3') => {
  try {
    const audioPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songId}${extension}`);
    if (fs.existsSync(audioPath)) {
      const data = fs.readFileSync(audioPath);
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    return null;
  } catch (error) {
    console.error('Error getting temp song:', error);
    return null;
  }
});

ipcMain.handle('delete-temp-song', async (event, songId, extension = '.mp3') => {
  try {
    const audioPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songId}${extension}`);
    const metaPath = path.join(DEFAULT_TEMP_SONGS_FOLDER, `${songId}.json`);

    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    return true;
  } catch (error) {
    console.error('Error deleting temp song:', error);
    return false;
  }
});

ipcMain.handle('clear-temp-songs', async () => {
  try {
    ensureDefaultFolders();

    const files = fs.readdirSync(DEFAULT_TEMP_SONGS_FOLDER);
    for (const file of files) {
      fs.unlinkSync(path.join(DEFAULT_TEMP_SONGS_FOLDER, file));
    }

    return true;
  } catch (error) {
    console.error('Error clearing temp songs:', error);
    return false;
  }
});

// IPC handler for updating mix metadata
ipcMain.handle('update-mix-metadata', async (event, mixMeta) => {
  try {
    ensureDefaultFolders();

    if (!mixFolder) {
      console.error('No mixFolder set, using default');
      mixFolder = DEFAULT_MIX_FOLDER;
    }

    // Find the mix file - try different possible patterns
    const possiblePaths = [
      path.join(mixFolder, `${mixMeta.id}.json`),
      path.join(mixFolder, `${mixMeta.name}.json`),
      path.join(DEFAULT_MIX_FOLDER, `${mixMeta.id}.json`),
      path.join(DEFAULT_MIX_FOLDER, `${mixMeta.name}.json`)
    ];

    // List all files
    const mixFolderFiles = fs.existsSync(mixFolder) ? fs.readdirSync(mixFolder) : [];
    const defaultFolderFiles = fs.existsSync(DEFAULT_MIX_FOLDER) ? fs.readdirSync(DEFAULT_MIX_FOLDER) : [];

    console.log('Trying to update mix:', mixMeta.name, 'with ID:', mixMeta.id);
    console.log('Files in mixFolder:', mixFolderFiles);
    console.log('Files in DEFAULT_MIX_FOLDER:', defaultFolderFiles);

    // Find any JSON file that might match by id or name in either folder
    let mixPath = null;

    // First try the exact paths
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        mixPath = tryPath;
        console.log('Found exact match at:', mixPath);
        break;
      }
    }

    // If not found, try searching by ID in json content
    if (!mixPath) {
      // Search in mix folder
      for (const file of mixFolderFiles.filter(f => f.endsWith('.json'))) {
        try {
          const fullPath = path.join(mixFolder, file);
          const data = fs.readFileSync(fullPath, 'utf8');
          const mix = JSON.parse(data);

          if (mix.id === mixMeta.id || mix.name === mixMeta.name) {
            mixPath = fullPath;
            console.log('Found match by content at:', mixPath);
            break;
          }
        } catch (err) {
          console.error(`Error checking file ${file}:`, err);
        }
      }

      // If still not found, try DEFAULT_MIX_FOLDER if different
      if (!mixPath && mixFolder !== DEFAULT_MIX_FOLDER) {
        for (const file of defaultFolderFiles.filter(f => f.endsWith('.json'))) {
          try {
            const fullPath = path.join(DEFAULT_MIX_FOLDER, file);
            const data = fs.readFileSync(fullPath, 'utf8');
            const mix = JSON.parse(data);

            if (mix.id === mixMeta.id || mix.name === mixMeta.name) {
              mixPath = fullPath;
              console.log('Found match by content in default folder at:', mixPath);
              break;
            }
          } catch (err) {
            console.error(`Error checking file ${file}:`, err);
          }
        }
      }
    }

    if (!mixPath) {
      // If still not found, create the file in the mix folder
      console.log('Mix not found, creating new file');
      mixPath = path.join(mixFolder, `${mixMeta.id || mixMeta.name}.json`);
    }

    console.log('Updating mix metadata at:', mixPath);

    // Update or create the metadata file
    fs.writeFileSync(mixPath, JSON.stringify(mixMeta, null, 2));

    return true;
  } catch (error) {
    console.error('Error updating mix metadata:', error);
    return false;
  }
});

// IPC handler for exporting project archive
ipcMain.handle('export-project-archive', async (event, mixId) => {
  try {
    ensureDefaultFolders();

    console.log(`Starting export for mix ID: ${mixId}`);

    // Handle undefined mixId by checking for files by their names
    if (!mixId) {
      console.log("Mix ID is undefined, trying to find mix by examining available files");
      const mixFiles = fs.readdirSync(DEFAULT_MIX_FOLDER);
      console.log(`Files in mix folder:`, mixFiles);

      // Get all json files
      const jsonFiles = mixFiles.filter(f => f.endsWith('.json'));
      if (jsonFiles.length === 0) {
        throw new Error('No mix files found in folder');
      }

      // If there's only one mix, use that
      if (jsonFiles.length === 1) {
        const jsonFile = jsonFiles[0];
        const jsonPath = path.join(DEFAULT_MIX_FOLDER, jsonFile);
        const wavFile = jsonFile.replace('.json', '.wav');
        const wavPath = path.join(DEFAULT_MIX_FOLDER, wavFile);

        if (fs.existsSync(wavPath)) {
          console.log(`Found single mix, using it: ${jsonFile}`);

          // Load the mix data to get the ID or use the filename without extension
          const mixData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          mixId = mixData.id || path.basename(jsonFile, '.json');
          console.log(`Using mix ID: ${mixId}`);
        }
      } else {
        throw new Error('Multiple mixes found. Please select a specific mix to export.');
      }
    }

    // Check if mix exists
    const mixMetaPath = path.join(DEFAULT_MIX_FOLDER, `${mixId}.json`);
    const mixWavPath = path.join(DEFAULT_MIX_FOLDER, `${mixId}.wav`);

    console.log(`Looking for mix files at:`);
    console.log(` - JSON: ${mixMetaPath}`);
    console.log(` - WAV: ${mixWavPath}`);

    // Add additional file existence check and logging
    const jsonExists = fs.existsSync(mixMetaPath);
    const wavExists = fs.existsSync(mixWavPath);

    console.log(`File existence check: JSON exists: ${jsonExists}, WAV exists: ${wavExists}`);

    if (!jsonExists || !wavExists) {
      // Try looking for files with spaces in the filename (common issue)
      const mixFiles = fs.readdirSync(DEFAULT_MIX_FOLDER);
      console.log(`Files in mix folder:`, mixFiles);

      // Try to find a match for this mixId with different casing or formatting
      let jsonMatch = null;
      let wavMatch = null;

      if (mixId) {
        jsonMatch = mixFiles.find(f => f.toLowerCase() === `${mixId.toLowerCase()}.json`);
        wavMatch = mixFiles.find(f => f.toLowerCase() === `${mixId.toLowerCase()}.wav`);
      }

      // If no match by ID, try searching by examining file contents
      if (!jsonMatch || !wavMatch) {
        console.log('No exact match by ID, trying to find by content examination');

        // Look for any json file that might have the correct mix
        for (const jsonFile of mixFiles.filter(f => f.endsWith('.json'))) {
          const jsonPath = path.join(DEFAULT_MIX_FOLDER, jsonFile);
          try {
            const mixData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

            // If we can find a matching ID or name, use this file
            if ((mixId && mixData.id === mixId) || mixData.name === mixId) {
              jsonMatch = jsonFile;
              wavMatch = jsonFile.replace('.json', '.wav');

              // Check if the WAV file exists
              if (!fs.existsSync(path.join(DEFAULT_MIX_FOLDER, wavMatch))) {
                wavMatch = null;
              }

              break;
            }
          } catch (err) {
            console.error(`Error reading json file ${jsonFile}:`, err);
          }
        }
      }

      if (jsonMatch && wavMatch) {
        console.log(`Found matching files with different casing/format:`);
        console.log(` - JSON: ${jsonMatch}`);
        console.log(` - WAV: ${wavMatch}`);

        // Use the found files instead
        const actualJsonPath = path.join(DEFAULT_MIX_FOLDER, jsonMatch);
        const actualWavPath = path.join(DEFAULT_MIX_FOLDER, wavMatch);

        // Continue with export using the found files
        const mixMeta = JSON.parse(fs.readFileSync(actualJsonPath, 'utf8'));

        // Ensure mixId is set for the rest of the function
        mixId = mixMeta.id || path.basename(jsonMatch, '.json');
        console.log(`Using mix ID from metadata: ${mixId}`);

        const mixName = mixMeta.name.replace(/[^\w\-. ]/g, '_'); // Sanitize for filenames

        // Ask user where to save the project archive
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Export Power Hour Project',
          defaultPath: path.join(app.getPath('downloads'), `${mixName}.phproject`),
          filters: [
            { name: 'Power Hour Project', extensions: ['phproject'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (canceled || !filePath) {
          return null;
        }

        // Create a temp directory for building the archive
        const tempDir = path.join(app.getPath('temp'), `ph-export-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy mix files to temp directory
        fs.copyFileSync(actualJsonPath, path.join(tempDir, 'mix.json'));
        fs.copyFileSync(actualWavPath, path.join(tempDir, 'mix.wav'));

        // Copy original files if they exist in backups
        const backupDir = path.join(DEFAULT_BACKUP_FOLDER, mixId);
        const originalFilesDir = path.join(tempDir, 'original_files');
        fs.mkdirSync(originalFilesDir, { recursive: true });

        if (fs.existsSync(backupDir)) {
          // Copy the structure recursively
          const copyRecursive = (src, dest) => {
            const entries = fs.readdirSync(src, { withFileTypes: true });

            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);

              if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };

          copyRecursive(backupDir, originalFilesDir);
        }

        // Copy extracted clips if they exist
        if (mixMeta.clips && mixMeta.clips.length > 0) {
          const clipsDir = path.join(tempDir, 'clips');
          fs.mkdirSync(clipsDir, { recursive: true });

          for (const clip of mixMeta.clips) {
            const clipPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clip.id}.wav`);
            if (fs.existsSync(clipPath)) {
              fs.copyFileSync(clipPath, path.join(clipsDir, `${clip.id}.wav`));
            }
          }
        }

        // If there's a drinking sound, copy it too
        if (mixMeta.hasDrinkingSound && mixMeta.projectData && mixMeta.projectData.drinkingSoundPath) {
          const drinkingDir = path.join(tempDir, 'drinking');
          fs.mkdirSync(drinkingDir, { recursive: true });

          // Check if drinking sound exists in backup
          const drinkingBackupPath = path.join(backupDir, 'drinking', path.basename(mixMeta.projectData.drinkingSoundPath));
          if (fs.existsSync(drinkingBackupPath)) {
            fs.copyFileSync(drinkingBackupPath, path.join(drinkingDir, path.basename(mixMeta.projectData.drinkingSoundPath)));
          }
        }

        // Create a JSON manifest with project info
        const manifest = {
          type: 'power-hour-project',
          version: '1.0',
          created: new Date().toISOString(),
          mixId: mixId,
          mixName: mixMeta.name,
          hasOriginalFiles: fs.existsSync(backupDir),
          clipCount: mixMeta.clips ? mixMeta.clips.length : 0,
          hasDrinkingSound: mixMeta.hasDrinkingSound
        };

        fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // Use a ZIP module to create the archive
        const archiver = require('archiver');
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`Archive created: ${filePath} (${archive.pointer()} bytes)`);
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true });
        });

        archive.on('error', (err) => {
          throw err;
        });

        archive.pipe(output);
        archive.directory(tempDir, false);
        await archive.finalize();

        return filePath;
      } else {
        console.log('No matching files found with different casing/format');
        throw new Error('Mix files not found');
      }
    }

    // Load mix metadata
    const mixMeta = JSON.parse(fs.readFileSync(mixMetaPath, 'utf8'));
    const mixName = mixMeta.name.replace(/[^\w\-. ]/g, '_'); // Sanitize for filenames

    // Ask user where to save the project archive
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Power Hour Project',
      defaultPath: path.join(app.getPath('downloads'), `${mixName}.phproject`),
      filters: [
        { name: 'Power Hour Project', extensions: ['phproject'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return null;
    }

    // Create a temp directory for building the archive
    const tempDir = path.join(app.getPath('temp'), `ph-export-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy mix files to temp directory
    fs.copyFileSync(mixMetaPath, path.join(tempDir, 'mix.json'));
    fs.copyFileSync(mixWavPath, path.join(tempDir, 'mix.wav'));

    // Copy original files if they exist in backups
    const backupDir = path.join(DEFAULT_BACKUP_FOLDER, mixId);
    const originalFilesDir = path.join(tempDir, 'original_files');
    fs.mkdirSync(originalFilesDir, { recursive: true });

    if (fs.existsSync(backupDir)) {
      // Copy the structure recursively
      const copyRecursive = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(backupDir, originalFilesDir);
    }

    // Copy extracted clips if they exist
    if (mixMeta.clips && mixMeta.clips.length > 0) {
      const clipsDir = path.join(tempDir, 'clips');
      fs.mkdirSync(clipsDir, { recursive: true });

      for (const clip of mixMeta.clips) {
        const clipPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, `${clip.id}.wav`);
        if (fs.existsSync(clipPath)) {
          fs.copyFileSync(clipPath, path.join(clipsDir, `${clip.id}.wav`));
        }
      }
    }

    // If there's a drinking sound, copy it too
    if (mixMeta.hasDrinkingSound && mixMeta.projectData && mixMeta.projectData.drinkingSoundPath) {
      const drinkingDir = path.join(tempDir, 'drinking');
      fs.mkdirSync(drinkingDir, { recursive: true });

      // Check if drinking sound exists in backup
      const drinkingBackupPath = path.join(backupDir, 'drinking', path.basename(mixMeta.projectData.drinkingSoundPath));
      if (fs.existsSync(drinkingBackupPath)) {
        fs.copyFileSync(drinkingBackupPath, path.join(drinkingDir, path.basename(mixMeta.projectData.drinkingSoundPath)));
      }
    }

    // Create a JSON manifest with project info
    const manifest = {
      type: 'power-hour-project',
      version: '1.0',
      created: new Date().toISOString(),
      mixId: mixId,
      mixName: mixMeta.name,
      hasOriginalFiles: fs.existsSync(backupDir),
      clipCount: mixMeta.clips ? mixMeta.clips.length : 0,
      hasDrinkingSound: mixMeta.hasDrinkingSound
    };

    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Use a ZIP module to create the archive
    const archiver = require('archiver');
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Archive created: ${filePath} (${archive.pointer()} bytes)`);
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    return filePath;
  } catch (error) {
    console.error('Error exporting project archive:', error);
    return null;
  }
});

// IPC handler for importing project archive
ipcMain.handle('import-project-archive', async (event, archivePath) => {
  try {
    ensureDefaultFolders();

    // If no path provided, ask the user
    if (!archivePath) {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Power Hour Project',
        filters: [
          { name: 'Power Hour Project', extensions: ['phproject'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      archivePath = filePaths[0];
    }

    // Create a temp directory for extracting the archive
    const tempDir = path.join(app.getPath('temp'), `ph-import-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract the archive
    const extract = require('extract-zip');
    await extract(archivePath, { dir: tempDir });

    // Check the manifest
    const manifestPath = path.join(tempDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Invalid project archive: missing manifest');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.type !== 'power-hour-project') {
      throw new Error('Invalid project archive type');
    }

    // Load the mix metadata
    const mixMetaPath = path.join(tempDir, 'mix.json');
    if (!fs.existsSync(mixMetaPath)) {
      throw new Error('Invalid project archive: missing mix metadata');
    }

    const mixMeta = JSON.parse(fs.readFileSync(mixMetaPath, 'utf8'));

    // Generate a new mix ID to avoid conflicts
    const newMixId = `import-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const oldMixId = mixMeta.id;
    mixMeta.id = newMixId;

    // Copy the mix files to our app folders
    fs.copyFileSync(path.join(tempDir, 'mix.wav'), path.join(DEFAULT_MIX_FOLDER, `${newMixId}.wav`));
    fs.writeFileSync(path.join(DEFAULT_MIX_FOLDER, `${newMixId}.json`), JSON.stringify(mixMeta, null, 2));

    // Create a backup folder for this mix
    const backupDir = path.join(DEFAULT_BACKUP_FOLDER, newMixId);
    fs.mkdirSync(backupDir, { recursive: true });

    // Copy original files if they exist
    const originalFilesDir = path.join(tempDir, 'original_files');
    if (fs.existsSync(originalFilesDir)) {
      // Copy the structure recursively
      const copyRecursive = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(originalFilesDir, backupDir);
    }

    // Copy extracted clips if they exist
    const clipsDir = path.join(tempDir, 'clips');
    if (fs.existsSync(clipsDir)) {
      const clips = fs.readdirSync(clipsDir);
      for (const clip of clips) {
        if (clip.endsWith('.wav')) {
          fs.copyFileSync(path.join(clipsDir, clip), path.join(DEFAULT_TEMP_CLIPS_FOLDER, clip));
        }
      }
    }

    // Copy drinking sound if it exists
    const drinkingDir = path.join(tempDir, 'drinking');
    if (fs.existsSync(drinkingDir)) {
      const drinkingFiles = fs.readdirSync(drinkingDir);
      if (drinkingFiles.length > 0) {
        const drinkingBackupDir = path.join(backupDir, 'drinking');
        fs.mkdirSync(drinkingBackupDir, { recursive: true });

        for (const file of drinkingFiles) {
          fs.copyFileSync(path.join(drinkingDir, file), path.join(drinkingBackupDir, file));
        }
      }
    }

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Return the imported mix metadata
    return mixMeta;
  } catch (error) {
    console.error('Error importing project archive:', error);
    return null;
  }
});

// IPC handler for backing up original files
ipcMain.handle('backup-original-files', async (event, mixId, originalFiles) => {
  try {
    ensureDefaultFolders();

    if (!mixId || !Array.isArray(originalFiles) || originalFiles.length === 0) {
      return false;
    }

    // Create a backup directory for this mix
    const backupDir = path.join(DEFAULT_BACKUP_FOLDER, mixId);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Process each original file
    for (const file of originalFiles) {
      if (!file.path || !file.buffer || file.buffer === null) {
        console.warn('Skipping file with invalid path or buffer:', file.path);
        continue;
      }

      // Determine the relative path structure
      let relativePath = file.relativePath || '';
      if (!relativePath) {
        // If no explicit relative path, use the basename
        relativePath = path.basename(file.path);
      }

      // Create the directory structure
      const destDir = path.dirname(path.join(backupDir, relativePath));
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Write the file
      const destPath = path.join(backupDir, relativePath);
      fs.writeFileSync(destPath, Buffer.from(file.buffer));
    }

    return true;
  } catch (error) {
    console.error('Error backing up original files:', error);
    return false;
  }
});

// IPC handler for loading original files
ipcMain.handle('load-original-files', async (event, mixId) => {
  try {
    ensureDefaultFolders();

    if (!mixId) {
      return null;
    }

    // Check if backup directory exists
    const backupDir = path.join(DEFAULT_BACKUP_FOLDER, mixId);
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    // Load file list recursively
    const files = [];

    const loadFilesRecursive = (dir, basePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          loadFilesRecursive(fullPath, relativePath);
        } else {
          // Read the file
          const buffer = fs.readFileSync(fullPath);
          const stats = fs.statSync(fullPath);

          files.push({
            path: fullPath,
            relativePath,
            name: entry.name,
            size: stats.size,
            buffer: buffer
          });
        }
      }
    };

    loadFilesRecursive(backupDir);

    return files;
  } catch (error) {
    console.error('Error loading original files:', error);
    return null;
  }
});

// Playlist management methods
ipcMain.handle('listPlaylists', async () => {
  try {
    ensureDefaultFolders();

    // Check if playlist folder exists
    if (!fs.existsSync(DEFAULT_PLAYLISTS_FOLDER)) {
      fs.mkdirSync(DEFAULT_PLAYLISTS_FOLDER, { recursive: true });
      return [];
    }

    console.log('Listing playlists from folder:', DEFAULT_PLAYLISTS_FOLDER);
    const files = fs.readdirSync(DEFAULT_PLAYLISTS_FOLDER);
    console.log('Files in playlists folder:', files);

    const playlists = files.filter(f => f.endsWith('.json')).map(f => {
      try {
        const data = fs.readFileSync(path.join(DEFAULT_PLAYLISTS_FOLDER, f));
        const playlist = JSON.parse(data);
        console.log(`Loaded playlist: ${playlist.name} (${f})`);
        return playlist;
      } catch (err) {
        console.error(`Error parsing JSON file ${f}:`, err);
        return null;
      }
    }).filter(Boolean); // Filter out any null values

    return playlists;
  } catch (error) {
    console.error('Error listing playlists:', error);
    return [];
  }
});

ipcMain.handle('savePlaylist', async (event, playlist) => {
  try {
    ensureDefaultFolders();

    if (!playlist || !playlist.id) {
      console.error('Invalid playlist data');
      return false;
    }

    console.log(`Saving playlist "${playlist.name}" to ${DEFAULT_PLAYLISTS_FOLDER}`);
    const filePath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlist.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(playlist, null, 2));
    console.log('Successfully saved playlist at:', filePath);

    return true;
  } catch (error) {
    console.error('Error saving playlist:', error);
    return false;
  }
});

ipcMain.handle('deletePlaylist', async (event, playlistId) => {
  try {
    ensureDefaultFolders();

    if (!playlistId) {
      console.error('Invalid playlist ID');
      return false;
    }

    const filePath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlistId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Successfully deleted playlist at:', filePath);
      return true;
    } else {
      console.error('Playlist file not found:', filePath);
      return false;
    }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return false;
  }
});

ipcMain.handle('exportPlaylist', async (event, playlistId) => {
  try {
    ensureDefaultFolders();

    if (!playlistId) {
      console.error('Invalid playlist ID for export');
      return { success: false, message: 'Invalid playlist ID' };
    }

    const playlistJsonPath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlistId}.json`);
    if (!fs.existsSync(playlistJsonPath)) {
      console.error('Playlist file not found for export:', playlistJsonPath);
      return { success: false, message: 'Playlist file not found' };
    }

    const playlistData = JSON.parse(fs.readFileSync(playlistJsonPath, 'utf8'));
    console.log(`Exporting playlist: ${playlistData.name}`);

    const result = await dialog.showSaveDialog({
      title: 'Export Playlist',
      defaultPath: `${playlistData.name.replace(/[\\/:*?"<>|]/g, '_')}.phpl`,
      filters: [{ name: 'Power Hour Playlist', extensions: ['phpl'] }]
    });

    if (result.canceled || !result.filePath) {
      console.log('Export canceled by user');
      return { success: false, message: 'Export canceled' };
    }

    const tempArchiveDir = path.join(app.getPath('temp'), `ph_export_${Date.now()}`);
    fs.mkdirSync(tempArchiveDir, { recursive: true });
    const tempClipsSubDir = path.join(tempArchiveDir, 'clips');
    fs.mkdirSync(tempClipsSubDir, { recursive: true });

    // Create a deep copy of playlistData to modify for the archive
    const playlistDataForArchive = JSON.parse(JSON.stringify(playlistData));
    let invalidClips = 0;

    for (let i = 0; i < playlistDataForArchive.clips.length; i++) {
      const clip = playlistDataForArchive.clips[i];
      const clipId = clip.id; // Should always exist
      if (!clipId) {
        console.warn('Clip in playlist.json missing ID, skipping:', clipInJson);
        clip.clipPath = null; // Mark as invalid
        invalidClips++;
        continue;
      }

      // clipInJson.clipPath from archive is the *filename* within the archive's 'clips' folder (e.g., <clipId>.wav)
      const archivedClipFileName = `${clipId}.wav`;
      const archivedClipMetaName = `${clipId}.json`;

      if (!clip.clipPath || !fs.existsSync(clip.clipPath)) {
        console.warn(`Clip ${clipId} has no valid clipPath, checking for alternative locations...`);

        // Try to find the clip in the DEFAULT_CLIPS_FOLDER
        const alternativeClipPath = path.join(DEFAULT_CLIPS_FOLDER, clipId, `${clipId}.wav`);
        if (fs.existsSync(alternativeClipPath)) {
          console.log(`Found alternative path for clip ${clipId}: ${alternativeClipPath}`);
          clip.clipPath = alternativeClipPath;
        } else {
          console.warn(`No valid clip file found for ${clipId}, skipping.`);
          clip.clipPath = null;
          invalidClips++;
          continue;
        }
      }

      try {
        // Copy the audio file to the temp directory with standardized name
        fs.copyFileSync(clip.clipPath, path.join(tempClipsSubDir, archivedClipFileName));

        // Update clipPath in the archive's playlist.json to the standardized name
        clip.clipPath = archivedClipFileName;

        // Try to find and copy associated .json metadata file for the clip
        const clipDir = path.dirname(clip.clipPath);
        const clipBaseName = path.basename(clip.clipPath, '.wav');
        const metaPath = path.join(clipDir, `${clipBaseName}.json`);

        if (fs.existsSync(metaPath)) {
          fs.copyFileSync(metaPath, path.join(tempClipsSubDir, archivedClipMetaName));
        } else {
           // If original metadata doesn't exist, create a basic one from the clip info we have
           const clipMetaDataForArchive = {
            id: clipId,
            name: clip.name || `Clip ${clipId}`,
            start: clip.start || 0,
            duration: clip.duration || 0,
            songName: clip.songName || 'Unknown Song',
            clipPath: archivedClipFileName // Path within the archive
          };
          fs.writeFileSync(path.join(tempClipsSubDir, archivedClipMetaName), JSON.stringify(clipMetaDataForArchive, null, 2));
        }
      } catch (err) {
        console.error(`Error processing clip ${clipId} for export:`, err);
        clip.clipPath = null;
        invalidClips++;
      }
    }

    // Add export information to the playlist metadata
    playlistDataForArchive.exportInfo = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      totalClips: playlistDataForArchive.clips.length,
      validClips: playlistDataForArchive.clips.length - invalidClips
    };

    // Save the modified playlistData to the archive
    fs.writeFileSync(path.join(tempArchiveDir, 'playlist.json'), JSON.stringify(playlistDataForArchive, null, 2));

    if (playlistData.drinkingSoundPath && fs.existsSync(playlistData.drinkingSoundPath)) {
      const drinkingSoundFileName = path.basename(playlistData.drinkingSoundPath);
      fs.copyFileSync(playlistData.drinkingSoundPath, path.join(tempArchiveDir, drinkingSoundFileName));
    }

    try {
      const archiver = require('archiver');
      const output = fs.createWriteStream(result.filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log(`Playlist archive created: ${result.filePath} (${archive.pointer()} bytes)`);
          try { fs.rmSync(tempArchiveDir, { recursive: true, force: true }); } catch (e) { console.error('Error cleaning up temp export dir:', e); }

          if (invalidClips > 0) {
            resolve({
              success: true,
              path: result.filePath,
              message: `Playlist exported with ${playlistDataForArchive.clips.length - invalidClips} of ${playlistDataForArchive.clips.length} clips. Some clips were missing or invalid.`
            });
          } else {
            resolve({ success: true, path: result.filePath });
          }
        });

        archive.on('warning', (err) => {
          console.warn('Archiver warning:', err);
        });

        archive.on('error', (err) => {
          console.error('Playlist archive creation error:', err);
          try { fs.rmSync(tempArchiveDir, { recursive: true, force: true }); } catch (e) { console.error('Error cleaning up temp export dir after error:', e); }
          reject({ success: false, message: 'Error creating archive: ' + err.message });
        });

        archive.pipe(output);
        archive.directory(tempArchiveDir, false);
        archive.finalize();
      });
    } catch (err) {
      console.error('Error with archiver module:', err);
      return { success: false, message: 'Error with zip library: ' + err.message };
    }
  } catch (error) {
    console.error('Error exporting playlist:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('importPlaylist', async () => {
  try {
    ensureDefaultFolders();
    const dialogResult = await dialog.showOpenDialog({
      title: 'Import Playlist',
      filters: [{ name: 'Power Hour Playlist', extensions: ['phpl'] }],
      properties: ['openFile']
    });

    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      console.log('Import canceled by user');
      return { success: false, message: 'Import canceled' };
    }

    const archivePath = dialogResult.filePaths[0];

    // Validate the file is actually a zip file
    try {
      const buffer = fs.readFileSync(archivePath, { start: 0, length: 4 });
      // Check for the ZIP file signature (PK\003\004)
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        return { success: false, message: 'The selected file is not a valid playlist archive.' };
      }
    } catch (err) {
      console.error('Error reading file header:', err);
      return { success: false, message: 'Unable to read the selected file.' };
    }

    const tempExtractDir = path.join(app.getPath('temp'), `ph_import_${Date.now()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    // Extract the ZIP archive
    try {
      const extract = require('extract-zip');
      await extract(archivePath, { dir: tempExtractDir });
    } catch (err) {
      console.error('Error extracting archive:', err);
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) { /* Ignore cleanup errors */ }
      return {
        success: false,
        message: 'Failed to extract the playlist archive. The file may be corrupted or not a valid Power Hour playlist file.'
      };
    }

    // Validate the extracted content has the expected structure
    const importedPlaylistJsonPath = path.join(tempExtractDir, 'playlist.json');
    if (!fs.existsSync(importedPlaylistJsonPath)) {
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) { /* Ignore cleanup errors */ }
      return { success: false, message: 'Invalid playlist archive: missing playlist.json' };
    }

    let playlistDataFromArchive;
    try {
      playlistDataFromArchive = JSON.parse(fs.readFileSync(importedPlaylistJsonPath, 'utf8'));
    } catch (err) {
      console.error('Error parsing playlist.json:', err);
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) { /* Ignore cleanup errors */ }
      return { success: false, message: 'The playlist.json file in the archive is corrupt or invalid.' };
    }

    // Generate a new ID for the imported playlist
    const newPlaylistId = `pl_${Date.now()}`;
    const finalPlaylistData = { ...playlistDataFromArchive, id: newPlaylistId, date: new Date().toISOString() };

    // This directory is for storing items *associated* with the playlist
    const playlistSpecificFilesDir = path.join(DEFAULT_PLAYLISTS_FOLDER, newPlaylistId + '_assets');
    if (!fs.existsSync(playlistSpecificFilesDir)) {
        fs.mkdirSync(playlistSpecificFilesDir, { recursive: true });
    }

    const importedClipsSubDir = path.join(tempExtractDir, 'clips');
    if (!fs.existsSync(importedClipsSubDir)) {
      console.warn('No clips directory found in archive, creating empty one');
      fs.mkdirSync(importedClipsSubDir, { recursive: true });
    }

    let validImportedClips = 0;
    let totalClips = finalPlaylistData.clips ? finalPlaylistData.clips.length : 0;

    for (let i = 0; i < finalPlaylistData.clips.length; i++) {
      const clipInJson = finalPlaylistData.clips[i];
      const clipId = clipInJson.id; // Should always exist
      if (!clipId) {
        console.warn('Clip in playlist.json missing ID, skipping:', clipInJson);
        clipInJson.clipPath = null; // Mark as invalid
        continue;
      }

      // clipInJson.clipPath from archive is the *filename* within the archive's 'clips' folder (e.g., <clipId>.wav)
      const archivedClipFileName = clipInJson.clipPath || `${clipId}.wav`;
      const archivedClipMetaName = `${clipId}.json`;

      const sourceClipFileInArchive = path.join(importedClipsSubDir, archivedClipFileName);
      const sourceMetaFileInArchive = path.join(importedClipsSubDir, archivedClipMetaName);

      const finalClipDir = path.join(DEFAULT_CLIPS_FOLDER, clipId);
      if (!fs.existsSync(finalClipDir)) {
        fs.mkdirSync(finalClipDir, { recursive: true });
      }
      const finalClipPath = path.join(finalClipDir, `${clipId}.wav`);
      const finalMetaPath = path.join(finalClipDir, `${clipId}.json`);

      if (fs.existsSync(sourceClipFileInArchive)) {
        try {
          fs.copyFileSync(sourceClipFileInArchive, finalClipPath);
          clipInJson.clipPath = finalClipPath; // CRITICAL: Update to the new, absolute path
          validImportedClips++;

          if (fs.existsSync(sourceMetaFileInArchive)) {
            // If metadata exists in archive, copy it and ensure its clipPath is also updated to absolute
            const clipMetaData = JSON.parse(fs.readFileSync(sourceMetaFileInArchive, 'utf8'));
            clipMetaData.clipPath = finalClipPath; // Ensure metadata also points to the correct final path
            clipMetaData.id = clipId; // Ensure ID consistency
            fs.writeFileSync(finalMetaPath, JSON.stringify(clipMetaData, null, 2));
          } else {
            // If no meta in archive, create a basic one
            const basicMetaData = {
              id: clipId,
              name: clipInJson.name || `Clip ${clipId}`,
              start: clipInJson.start || 0,
              duration: clipInJson.duration || 0,
              songName: clipInJson.songName || 'Unknown Song',
              clipPath: finalClipPath
            };
            fs.writeFileSync(finalMetaPath, JSON.stringify(basicMetaData, null, 2));
          }
        } catch (err) {
          console.error(`Error copying clip ${clipId}:`, err);
          clipInJson.clipPath = null; // Mark as invalid
        }
      } else {
        console.warn(`Archived clip file not found: ${sourceClipFileInArchive} for clip ${clipId}`);
        clipInJson.clipPath = null; // Mark as invalid
      }
    }

    // Handle drinking sound
    if (playlistDataFromArchive.drinkingSoundPath) {
        // The path in the archive is relative to the archive root.
        const archivedDrinkingSoundFileName = playlistDataFromArchive.drinkingSoundPath;
        const sourceDrinkingSoundPath = path.join(tempExtractDir, archivedDrinkingSoundFileName);
        if (fs.existsSync(sourceDrinkingSoundPath)) {
            const finalDrinkingSoundPath = path.join(playlistSpecificFilesDir, archivedDrinkingSoundFileName);
            fs.copyFileSync(sourceDrinkingSoundPath, finalDrinkingSoundPath);
            finalPlaylistData.drinkingSoundPath = finalDrinkingSoundPath; // Update to new absolute path
        } else {
            console.warn(`Drinking sound specified in playlist.json (${archivedDrinkingSoundFileName}) but not found in archive.`);
            finalPlaylistData.drinkingSoundPath = null;
        }
    } else {
        finalPlaylistData.drinkingSoundPath = null; // Ensure it's null if not present
    }

    // Add import information
    finalPlaylistData.importInfo = {
      importDate: new Date().toISOString(),
      originalName: playlistDataFromArchive.name || 'Unknown',
      originalId: playlistDataFromArchive.id || 'Unknown',
      validClips: validImportedClips,
      totalClipsInJson: totalClips,
      sourceFile: path.basename(archivePath)
    };

    const finalPlaylistJsonPath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${newPlaylistId}.json`);
    fs.writeFileSync(finalPlaylistJsonPath, JSON.stringify(finalPlaylistData, null, 2));

    const playlistStatus = validImportedClips === totalClips
      ? 'Playlist imported successfully.'
      : `Playlist imported with ${validImportedClips} of ${totalClips} clips. Some clips may be missing or were invalid.`;

    console.log(`${playlistStatus} Name: ${finalPlaylistData.name} (ID: ${newPlaylistId})`);

    try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) { console.error('Error cleaning up temp import dir:', e); }

    return {
      success: true,
      name: finalPlaylistData.name,
      playlist: finalPlaylistData, // Send the full playlist object back
      message: playlistStatus
    };

  } catch (error) {
    console.error('Error importing playlist:', error);
    return { success: false, message: error.message };
  }
});

// New handler to save a playlist coming from the creator/SongUploader page
ipcMain.handle('savePlaylistFromCreator', async (event, playlistToSave) => {
  try {
    ensureDefaultFolders();
    if (!playlistToSave || !playlistToSave.id || !playlistToSave.name) {
      console.error('Invalid playlist data received for savePlaylistFromCreator');
      return { success: false, message: 'Invalid playlist data' };
    }

    // Ensure all clipPaths within the playlist are valid and exist before saving
    // This step assumes clips were already processed by saveClipToFile and have correct absolute paths.
    for (const clip of playlistToSave.clips) {
      if (!clip.clipPath || !fs.existsSync(clip.clipPath)) {
        console.error(`Invalid or missing clipPath for clip ${clip.id} (${clip.name}): ${clip.clipPath}`);
        // Optionally, could try to self-heal here if there's a known pattern, but for now, error out
        return { success: false, message: `Invalid clip path for ${clip.name}` };
      }
      // Also ensure its associated .json metadata file exists
      const metaPath = path.join(path.dirname(clip.clipPath), `${clip.id}.json`);
      if (!fs.existsSync(metaPath)) {
         console.warn(`Metadata file missing for clip ${clip.id} at ${metaPath}. Recreating.`);
         const clipMetaData = {
            id: clip.id,
            name: clip.name,
            start: clip.start || 0,
            duration: clip.duration || 0,
            songName: clip.songName || 'Unknown Song',
            clipPath: clip.clipPath
          };
          fs.writeFileSync(metaPath, JSON.stringify(clipMetaData, null, 2));
      }
    }

    const playlistFilePath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlistToSave.id}.json`);
    fs.writeFileSync(playlistFilePath, JSON.stringify(playlistToSave, null, 2));
    console.log(`Playlist "${playlistToSave.name}" saved successfully from creator to: ${playlistFilePath}`);
    return { success: true, playlist: playlistToSave };

  } catch (error) {
    console.error('Error in savePlaylistFromCreator:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('createMixFromPlaylist', async (event, playlistId) => {
  try {
    ensureDefaultFolders();

    if (!playlistId) {
      console.error('Invalid playlist ID');
      return { success: false };
    }

    // Read the playlist file
    const playlistPath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlistId}.json`);
    if (!fs.existsSync(playlistPath)) {
      console.error('Playlist file not found:', playlistPath);
      return { success: false };
    }

    const playlistData = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    console.log(`Creating mix from playlist: ${playlistData.name} with ${playlistData.clips.length} clips`);

    // Log clip paths to help with debugging
    playlistData.clips.forEach((clip, index) => {
      console.log(`Clip ${index}: ${clip.name}, Path: ${clip.clipPath}, Exists: ${clip.clipPath ? fs.existsSync(clip.clipPath) : false}`);
    });

    // Verify all clips have valid paths
    const validClips = playlistData.clips.filter(clip => {
      const exists = clip.clipPath && fs.existsSync(clip.clipPath);
      if (!exists && clip.clipPath) {
        console.error(`Clip path doesn't exist: ${clip.clipPath}`);

        // Try to find the clip in the clips folder by ID
        const alternativePath = path.join(DEFAULT_CLIPS_FOLDER, clip.id, `${clip.id}.wav`);
        if (fs.existsSync(alternativePath)) {
          console.log(`Found alternative path for clip ${clip.id}: ${alternativePath}`);
          clip.clipPath = alternativePath;
          return true;
        }
      }
      return exists;
    });

    console.log(`Found ${validClips.length} valid clips out of ${playlistData.clips.length}`);

    if (validClips.length === 0) {
      console.error('No valid clips found in playlist');
      return { success: false };
    }

    // Verify drinking sound if specified
    let drinkingSoundBuffer = null;
    if (playlistData.drinkingSoundPath && fs.existsSync(playlistData.drinkingSoundPath)) {
      drinkingSoundBuffer = fs.readFileSync(playlistData.drinkingSoundPath);
      console.log(`Loaded drinking sound from ${playlistData.drinkingSoundPath}`);
    } else if (playlistData.drinkingSoundPath) {
      console.log(`Drinking sound path specified but not found: ${playlistData.drinkingSoundPath}`);
    }

    // Use AudioContext to combine clips
    const AudioContext = require('web-audio-api').AudioContext;
    const audioContext = new AudioContext();

    // Load all clip buffers
    const clipBuffers = [];
    for (const clip of validClips) {
      try {
        console.log(`Loading clip from ${clip.clipPath}`);
        const clipBuffer = fs.readFileSync(clip.clipPath);

        const audioBuffer = await new Promise((resolve, reject) => {
          audioContext.decodeAudioData(clipBuffer.buffer, resolve, reject);
        });
        clipBuffers.push(audioBuffer);
        console.log(`Successfully decoded clip: ${clip.name}, duration: ${audioBuffer.duration}s`);
      } catch (err) {
        console.error(`Error loading/decoding clip ${clip.name} from ${clip.clipPath}:`, err);
      }
    }

    if (clipBuffers.length === 0) {
      console.error('Failed to decode any clips');
      return { success: false };
    }

    console.log(`Successfully loaded ${clipBuffers.length} clip buffers`);

    // Load drinking sound buffer if available
    let drinkingAudioBuffer = null;
    if (drinkingSoundBuffer) {
      try {
        drinkingAudioBuffer = await new Promise((resolve, reject) => {
          audioContext.decodeAudioData(drinkingSoundBuffer.buffer, resolve, reject);
        });
        console.log(`Successfully decoded drinking sound, duration: ${drinkingAudioBuffer.duration}s`);
      } catch (err) {
        console.error('Error decoding drinking sound:', err);
      }
    }

    // Calculate total length
    let totalLength = 0;
    clipBuffers.forEach((buffer, i) => {
      totalLength += buffer.length;
      // Add drinking sound length for all clips except the last one
      if (drinkingAudioBuffer && i < clipBuffers.length - 1) {
        totalLength += drinkingAudioBuffer.length;
      }
    });

    console.log(`Creating output buffer with total length: ${totalLength} samples`);

    // Create output buffer
    const outputBuffer = audioContext.createBuffer(
      2, // Stereo
      totalLength,
      audioContext.sampleRate
    );

    // Fill output buffer
    let offset = 0;
    for (let i = 0; i < clipBuffers.length; i++) {
      const buffer = clipBuffers[i];

      // Copy clip data
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const bufferData = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));

        for (let j = 0; j < buffer.length; j++) {
          outputData[offset + j] = bufferData[j];
        }
      }

      offset += buffer.length;

      // Add drinking sound between clips (except after the last clip)
      if (drinkingAudioBuffer && i < clipBuffers.length - 1) {
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          const outputData = outputBuffer.getChannelData(channel);
          const drinkingData = drinkingAudioBuffer.getChannelData(
            Math.min(channel, drinkingAudioBuffer.numberOfChannels - 1)
          );

          for (let j = 0; j < drinkingAudioBuffer.length; j++) {
            outputData[offset + j] = drinkingData[j];
          }
        }

        offset += drinkingAudioBuffer.length;
      }
    }

    console.log('Converting output buffer to WAV');

    // Direct conversion to WAV without external libraries
    function audioBufferToWav(buffer) {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2;
      const sampleRate = buffer.sampleRate;
      const startHeaderSize = 44; // Standard WAV header size

      // Create a WAV buffer, including header + sample data
      const arrayBuffer = new ArrayBuffer(startHeaderSize + length);
      const view = new DataView(arrayBuffer);

      // Write the WAV container header
      writeString(view, 0, 'RIFF'); // RIFF identifier
      view.setUint32(4, 36 + length, true); // file length
      writeString(view, 8, 'WAVE'); // RIFF type
      writeString(view, 12, 'fmt '); // format chunk identifier
      view.setUint32(16, 16, true); // format chunk length
      view.setUint16(20, 1, true); // sample format (1 is PCM)
      view.setUint16(22, numOfChan, true); // channel count
      view.setUint32(24, sampleRate, true); // sample rate
      view.setUint32(28, sampleRate * 2 * numOfChan, true); // byte rate (sample rate * block align)
      view.setUint16(32, numOfChan * 2, true); // block align (channel count * bytes per sample)
      view.setUint16(34, 16, true); // bits per sample
      writeString(view, 36, 'data'); // data chunk identifier
      view.setUint32(40, length, true); // data chunk length

      // Write the audio sample data
      // Convert Float32 to Int16 and add to buffer
      let offset = startHeaderSize;
      for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numOfChan; c++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
          const int16 = sample < 0 ? sample * 32768 : sample * 32767;
          view.setInt16(offset, int16, true);
          offset += 2;
        }
      }

      return Buffer.from(arrayBuffer);
    }

    // Helper function to write strings to DataView
    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    // Convert output buffer to WAV
    const wavBuffer = audioBufferToWav(outputBuffer);

    // Create a unique ID for the mix
    const mixId = Date.now().toString();

    // Create mix metadata
    const mix = {
      id: mixId,
      name: `${playlistData.name} Mix`,
      date: new Date().toISOString(),
      songList: validClips.map(c => c.name),
      filename: `${mixId}.wav`,
      fromPlaylist: {
        id: playlistData.id,
        name: playlistData.name
      }
    };

    // Save mix file
    const mixFilePath = path.join(DEFAULT_MIX_FOLDER, `${mixId}.wav`);
    fs.writeFileSync(mixFilePath, wavBuffer);

    // Save mix metadata
    const metaFilePath = path.join(DEFAULT_MIX_FOLDER, `${mixId}.json`);
    fs.writeFileSync(metaFilePath, JSON.stringify(mix, null, 2));

    // Set the local file path for playback
    mix.localFilePath = mixFilePath;

    console.log(`Successfully created mix: ${mix.name}`);

    return {
      success: true,
      mix
    };
  } catch (error) {
    console.error('Error creating mix from playlist:', error);
    return { success: false };
  }
});

// Clip file operations
ipcMain.handle('saveClipToFile', async (event, clipId, buffer, clipMeta) => {
  try {
    ensureDefaultFolders();

    if (!clipId || !buffer || buffer === null) {
      console.error('Invalid clip data for saveClipToFile - missing clipId or buffer is null');
      return { success: false, message: 'Invalid clip data' };
    }

    const clipDir = path.join(DEFAULT_CLIPS_FOLDER, clipId);
    if (!fs.existsSync(clipDir)) {
      fs.mkdirSync(clipDir, { recursive: true });
    }

    const clipFilePath = path.join(clipDir, `${clipId}.wav`);
    fs.writeFileSync(clipFilePath, Buffer.from(buffer));

    const metaDataWithFullPath = {
      ...clipMeta,
      id: clipId, // Ensure ID is consistent
      clipPath: clipFilePath // Add the absolute path
    };

    const metaFilePath = path.join(clipDir, `${clipId}.json`);
    fs.writeFileSync(metaFilePath, JSON.stringify(metaDataWithFullPath, null, 2));

    console.log(`Clip ${clipId} saved to ${clipFilePath} and metadata to ${metaFilePath}`);
    return { success: true, clipPath: clipFilePath, metadata: metaDataWithFullPath };

  } catch (error) {
    console.error('Error saving clip to file:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getClipFromFile', async (event, clipPath) => {
  try {
    if (!clipPath || !fs.existsSync(clipPath)) {
      console.error('Clip file not found:', clipPath);
      return null;
    }

    // Read the audio file
    const buffer = fs.readFileSync(clipPath);

    // Read the metadata if it exists
    const metaPath = clipPath.replace(/\.wav$/i, '.json');
    let metadata = null;

    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (err) {
        console.error('Error parsing clip metadata:', err);
      }
    }

    return {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      metadata
    };
  } catch (error) {
    console.error('Error getting clip from file:', error);
    return null;
  }
});

// Handler for selecting a drinking sound for a playlist
ipcMain.handle('selectDrinkingSound', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Drinking Sound',
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'No file selected' };
    }

    return {
      success: true,
      path: result.filePaths[0],
      message: 'Drinking sound selected successfully'
    };
  } catch (error) {
    console.error('Error selecting drinking sound:', error);
    return { success: false, message: `Error selecting drinking sound: ${error.message}` };
  }
});

// Handler for selecting a playlist image
ipcMain.handle('selectPlaylistImage', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Playlist Image',
      properties: ['openFile'],
      filters: [
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'No file selected' };
    }

    return {
      success: true,
      path: result.filePaths[0],
      message: 'Playlist image selected successfully'
    };
  } catch (error) {
    console.error('Error selecting playlist image:', error);
    return { success: false, message: `Error selecting playlist image: ${error.message}` };
  }
});

// After the exportPlaylist handler
ipcMain.handle('exportPlaylistAsAudio', async (event, playlistId) => {
  try {
    ensureDefaultFolders();

    if (!playlistId) {
      console.error('Invalid playlist ID for audio export');
      return { success: false, message: 'Invalid playlist ID' };
    }

    const playlistJsonPath = path.join(DEFAULT_PLAYLISTS_FOLDER, `${playlistId}.json`);
    if (!fs.existsSync(playlistJsonPath)) {
      console.error('Playlist file not found for audio export:', playlistJsonPath);
      return { success: false, message: 'Playlist file not found' };
    }

    const playlistData = JSON.parse(fs.readFileSync(playlistJsonPath, 'utf8'));
    console.log(`Exporting playlist as audio: ${playlistData.name}`);

    // Check if drinking sound is set
    if (!playlistData.drinkingSoundPath || !fs.existsSync(playlistData.drinkingSoundPath)) {
      console.error('Drinking sound not set or file not found:', playlistData.drinkingSoundPath);
      return { success: false, message: 'Drinking sound not set or file not found' };
    }

    // Check if ffmpeg is available
    try {
      const ffmpegPath = require('ffmpeg-static');
      if (!ffmpegPath) {
        throw new Error('ffmpeg-static not found');
      }
    } catch (err) {
      console.error('ffmpeg-static not available:', err);
      return {
        success: false,
        message: 'FFmpeg is required for audio export but not available. Please contact support.'
      };
    }

    // Verify all clips have valid paths
    const validClips = playlistData.clips.filter(clip => clip.clipPath && fs.existsSync(clip.clipPath));

    if (validClips.length === 0) {
      console.error('No valid clips found in playlist for audio export');
      return { success: false, message: 'No valid clips found in playlist' };
    }

    if (validClips.length < playlistData.clips.length) {
      console.warn(`Some clips have invalid paths: ${playlistData.clips.length - validClips.length} clips skipped`);
    }

    // Ask user where to save the exported audio file
    const result = await dialog.showSaveDialog({
      title: 'Export Playlist as Audio',
      defaultPath: `${playlistData.name.replace(/[\\/:*?"<>|]/g, '_')}.mp3`,
      filters: [
        { name: 'MP3 Files', extensions: ['mp3'] },
        { name: 'WAV Files', extensions: ['wav'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      console.log('Audio export canceled by user');
      return { success: false, message: 'Export canceled' };
    }

    const outputPath = result.filePath;
    const outputFormat = path.extname(outputPath).toLowerCase() === '.wav' ? 'wav' : 'mp3';

    // Create a temporary folder for input file list
    const tempDir = path.join(app.getPath('temp'), `ph_audio_export_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Build an input arguments array for ffmpeg
    const inputArgs = [];
    const filterComplex = [];
    let mergeCommand = '';

    // First add all input files
    for (let i = 0; i < validClips.length; i++) {
      // Add clip as input
      inputArgs.push('-i', validClips[i].clipPath);

      // Add drinking sound as input after every clip except the last one
      if (i < validClips.length - 1) {
        inputArgs.push('-i', playlistData.drinkingSoundPath);
      }
    }

    // Build the filter_complex string for concatenation
    // This approach handles different formats, sample rates, etc.
    const totalInputs = validClips.length * 2 - 1; // Clips + drinking sounds (except after last clip)

    // Convert each input to the same audio format
    for (let i = 0; i < totalInputs; i++) {
      filterComplex.push(`[${i}:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[a${i}]`);
    }

    // Concatenate all normalized streams
    let concatInputs = '';
    for (let i = 0; i < totalInputs; i++) {
      concatInputs += `[a${i}]`;
    }
    filterComplex.push(`${concatInputs}concat=n=${totalInputs}:v=0:a=1[aout]`);

    console.log('Starting ffmpeg process for audio export with filter-based concatenation');

    // Build the ffmpeg command
    const ffmpeg = require('ffmpeg-static');
    const { spawn } = require('child_process');

    // Create ffmpeg process
    const ffmpegProcess = spawn(ffmpeg, [
      ...inputArgs,
      '-filter_complex', filterComplex.join(';'),
      '-map', '[aout]',
      '-c:a', outputFormat === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-b:a', '192k',
      outputPath
    ]);

    // Wait for ffmpeg to finish
    await new Promise((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('FFmpeg process completed successfully');
          resolve();
        } else {
          console.error(`FFmpeg process exited with code ${code}`);
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess.stderr.on('data', (data) => {
        console.log(`ffmpeg: ${data}`);
      });
    });

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up temp directory:', err);
    }

    console.log(`Playlist audio exported successfully to: ${outputPath}`);
    return {
      success: true,
      path: outputPath,
      message: `Playlist exported as audio to: ${outputPath}`
    };

  } catch (error) {
    console.error('Error exporting playlist as audio:', error);
    return {
      success: false,
      message: `Failed to export playlist as audio: ${error.message}`
    };
  }
});

// Album art extraction handler
ipcMain.handle('extract-album-art', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return {
        success: false,
        message: 'File not found'
      };
    }

    // Use music-metadata to extract album art
    const metadata = await mm.parseFile(filePath, { duration: false });

    if (metadata.common.picture && metadata.common.picture.length > 0) {
      // Get the first picture (usually the cover art)
      const picture = metadata.common.picture[0];

      return {
        success: true,
        imageBuffer: picture.data.buffer.slice(
          picture.data.byteOffset,
          picture.data.byteOffset + picture.data.byteLength
        ),
        mimeType: picture.format || 'image/jpeg'
      };
    }

    return {
      success: false,
      message: 'No album art found in file'
    };
  } catch (error) {
    console.error('Error extracting album art:', error);
    return {
      success: false,
      message: `Failed to extract album art: ${error.message}`
    };
  }
});

// Album art online lookup handler
ipcMain.handle('lookup-album-art', async (event, artist, album) => {
  try {
    if (!artist || !album) {
      return {
        success: false,
        message: 'Artist and album are required for lookup'
      };
    }

    console.log(`Album art lookup requested for: ${artist} - ${album}`);

    // Try iTunes Search API first (no API key required)
    try {
      const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + album)}&media=music&entity=album&limit=1`;

      const response = await fetch(iTunesUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.artworkUrl100) {
          // Get higher resolution artwork by replacing the size in the URL
          const highResArtwork = result.artworkUrl100.replace('100x100bb', '600x600bb');

          console.log(`Found album art via iTunes: ${highResArtwork}`);
          return {
            success: true,
            imageUrl: highResArtwork,
            source: 'iTunes'
          };
        }
      }
    } catch (iTunesError) {
      console.warn('iTunes lookup failed:', iTunesError.message);
    }

    // Try Last.fm API as fallback (no API key required for album.getinfo)
    try {
      const lastFmUrl = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=YOUR_API_KEY&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&format=json`;

      // For now, skip Last.fm since it requires an API key
      // In a production app, you would register for a Last.fm API key
      console.log('Last.fm lookup skipped (requires API key)');
    } catch (lastFmError) {
      console.warn('Last.fm lookup failed:', lastFmError.message);
    }

    // Try MusicBrainz + Cover Art Archive (no API key required)
    try {
      // First, search for the release on MusicBrainz
      const mbSearchUrl = `https://musicbrainz.org/ws/2/release/?query=artist:"${encodeURIComponent(artist)}" AND release:"${encodeURIComponent(album)}"&fmt=json&limit=1`;

      const mbResponse = await fetch(mbSearchUrl, {
        headers: {
          'User-Agent': 'PHat5-MusicApp/1.0 (contact@example.com)'
        }
      });

      const mbData = await mbResponse.json();

      if (mbData.releases && mbData.releases.length > 0) {
        const releaseId = mbData.releases[0].id;

        // Try to get cover art from Cover Art Archive
        const coverArtUrl = `https://coverartarchive.org/release/${releaseId}/front`;

        // Check if cover art exists by making a HEAD request
        const coverArtResponse = await fetch(coverArtUrl, { method: 'HEAD' });

        if (coverArtResponse.ok) {
          console.log(`Found album art via MusicBrainz/Cover Art Archive: ${coverArtUrl}`);
          return {
            success: true,
            imageUrl: coverArtUrl,
            source: 'MusicBrainz'
          };
        }
      }
    } catch (mbError) {
      console.warn('MusicBrainz lookup failed:', mbError.message);
    }

    // No album art found from any source
    return {
      success: false,
      message: 'No album art found from online sources'
    };
  } catch (error) {
    console.error('Error looking up album art:', error);
    return {
      success: false,
      message: `Failed to lookup album art: ${error.message}`
    };
  }
});

// Save drinking sound handler
ipcMain.handle('save-drinking-sound', async (event, fileBuffer) => {
  try {
    ensureDefaultFolders();

    // Create a unique filename for the drinking sound
    const timestamp = Date.now();
    const filename = `drinking_sound_${timestamp}.wav`;
    const soundPath = path.join(DEFAULT_TEMP_CLIPS_FOLDER, filename);

    // Save the file
    fs.writeFileSync(soundPath, Buffer.from(fileBuffer));

    return {
      success: true,
      path: soundPath,
      message: 'Drinking sound saved successfully'
    };
  } catch (error) {
    console.error('Error saving drinking sound:', error);
    return {
      success: false,
      message: `Failed to save drinking sound: ${error.message}`
    };
  }
});

// yt-dlp handlers
const { spawn } = require('child_process');

// Execute yt-dlp command
const executeYtDlp = (pythonCommand, args) => {
  return new Promise((resolve, reject) => {
    const fullArgs = ['-m', 'yt_dlp', ...args];
    console.log('🚀 Executing yt-dlp:', pythonCommand, fullArgs.join(' '));

    const process = spawn(pythonCommand, fullArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false // Disable shell to prevent argument splitting
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse JSON output
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            resolve([]);
            return;
          }

          const results = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              console.warn('Failed to parse JSON line:', line);
              return null;
            }
          }).filter(Boolean);

          resolve(results.length === 1 ? results[0] : results);
        } catch (error) {
          console.error('Failed to parse yt-dlp output:', error);
          resolve(stdout);
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
};

// Check if yt-dlp is available
ipcMain.handle('yt-dlp-check-availability', async () => {
  const pythonCommands = ['python', 'python3', 'py'];

  for (const pythonCmd of pythonCommands) {
    try {
      console.log('🔧 Testing yt-dlp with Python command:', pythonCmd);
      await executeYtDlp(pythonCmd, ['--version']);
      console.log('✅ yt-dlp is available with:', pythonCmd);
      return { available: true, pythonCommand: pythonCmd };
    } catch (error) {
      console.log('⚠️ yt-dlp test failed with:', pythonCmd, error.message);
    }
  }

  return { available: false, pythonCommand: null };
});

// Search YouTube using yt-dlp
ipcMain.handle('yt-dlp-search', async (event, query, maxResults = 25) => {
  try {
    console.log('🚀 Starting yt-dlp search for:', query);

    // First check if yt-dlp is available and get the correct Python command
    const pythonCommands = ['python', 'python3', 'py'];
    let workingPythonCmd = null;

    for (const pythonCmd of pythonCommands) {
      try {
        console.log('🔧 Testing yt-dlp with Python command:', pythonCmd);
        await executeYtDlp(pythonCmd, ['--version']);
        workingPythonCmd = pythonCmd;
        console.log('✅ yt-dlp is available with:', pythonCmd);
        break;
      } catch (error) {
        console.log('⚠️ yt-dlp test failed with:', pythonCmd, error.message);
      }
    }

    if (!workingPythonCmd) {
      throw new Error('yt-dlp not available with any Python command');
    }

    // Use yt-dlp to search YouTube
    const searchUrl = `ytsearch${maxResults}:${query}`;

    console.log('🔍 Executing yt-dlp search:', searchUrl);

    // Get video information using yt-dlp
    const videoInfos = await executeYtDlp(workingPythonCmd, [
      searchUrl,
      '--flat-playlist',
      '--dump-json',
      '--no-download'
    ]);

    console.log('📊 yt-dlp returned:', Array.isArray(videoInfos) ? videoInfos.length : 1, 'results');

    return {
      success: true,
      data: videoInfos
    };

  } catch (error) {
    console.error('❌ yt-dlp search failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Search YouTube channels using yt-dlp - COMPLETELY REMADE
ipcMain.handle('yt-dlp-channel-search', async (event, query, maxResults = 5, pageToken, sortOrder = 'relevance') => {
  try {
    console.log('🚀 Starting NEW yt-dlp channel search for:', query, 'maxResults:', maxResults, 'page:', pageToken, 'sort:', sortOrder);

    // Check if yt-dlp is available and get the correct Python command
    const pythonCommands = ['python', 'python3', 'py'];
    let workingPythonCmd = null;

    for (const pythonCmd of pythonCommands) {
      try {
        await executeYtDlp(pythonCmd, ['--version']);
        workingPythonCmd = pythonCmd;
        console.log('✅ yt-dlp is available with:', pythonCmd);
        break;
      } catch (error) {
        console.log('⚠️ yt-dlp test failed with:', pythonCmd);
      }
    }

    if (!workingPythonCmd) {
      throw new Error('yt-dlp is not installed or not available. Please install yt-dlp: pip install yt-dlp');
    }

    // Calculate pagination
    const page = pageToken ? parseInt(pageToken.split('_')[1]) || 1 : 1;
    const searchLimit = maxResults * 10; // Search for more results to ensure we have enough channels

    console.log('🔍 Searching for channels with query:', query, 'limit:', searchLimit);

    // Use yt-dlp to search for videos and extract unique channels
    // Use a two-step approach: first get basic results, then get detailed channel info
    const searchUrl = `ytsearch${searchLimit}:${query}`;

    console.log('🔍 Step 1: Getting basic video results...');
    const videoResults = await executeYtDlp(workingPythonCmd, [
      searchUrl,
      '--flat-playlist',
      '--dump-json',
      '--no-download'
    ]);

    console.log('📊 yt-dlp returned:', Array.isArray(videoResults) ? videoResults.length : 1, 'video results');

    // Convert to array if single result
    const videos = Array.isArray(videoResults) ? videoResults : [videoResults];

    // Extract unique channels from video results
    const channelMap = new Map();
    const queryLower = query.toLowerCase();

    videos.forEach((video, index) => {
      if (video.channel_id && video.channel && !channelMap.has(video.channel_id)) {
        const channelNameLower = video.channel.toLowerCase();

        // Calculate simple relevance score
        let relevanceScore = index; // Base score (lower is better)

        // Boost relevance for exact matches
        if (channelNameLower === queryLower) {
          relevanceScore -= 1000;
        } else if (channelNameLower.includes(queryLower)) {
          relevanceScore -= 500;
        } else if (channelNameLower.startsWith(queryLower)) {
          relevanceScore -= 250;
        }

        // Boost for music-related channels
        if (channelNameLower.includes(' - topic')) {
          relevanceScore -= 800; // Topic channels are official
        } else if (channelNameLower.includes('vevo')) {
          relevanceScore -= 600; // VEVO channels are official music
        } else if (channelNameLower.includes('music') || channelNameLower.includes('records')) {
          relevanceScore -= 300; // Music-related channels
        }

        // Get best thumbnail - try multiple approaches
        let thumbnail = '';

        // Method 1: Try different YouTube channel avatar URL patterns
        if (video.channel_id) {
          // Try the most common patterns for YouTube channel avatars
          const channelId = video.channel_id;
          const avatarPatterns = [
            `https://yt3.ggpht.com/ytc/AIdro_${channelId}=s240-c-k-c0x00ffffff-no-rj`,
            `https://yt3.ggpht.com/a/default-user=s240-c-k-c0x00ffffff-no-rj`,
            `https://yt3.ggpht.com/ytc/${channelId}=s240-c-k-c0x00ffffff-no-rj`,
            `https://yt3.ggpht.com/a/${channelId}=s240-c-k-c0x00ffffff-no-rj`
          ];
          thumbnail = avatarPatterns[0]; // Use the first pattern as primary
        }

        // Method 2: Fallback to video thumbnail if available
        if (!thumbnail && video.thumbnails && Array.isArray(video.thumbnails)) {
          const bestThumbnail = video.thumbnails.find(t => t.id === 'medium') ||
                               video.thumbnails.find(t => t.width >= 320) ||
                               video.thumbnails[0];
          thumbnail = bestThumbnail?.url || '';
        } else if (!thumbnail && video.thumbnail) {
          thumbnail = video.thumbnail;
        }

        // Method 3: Final fallback - use a default YouTube icon
        if (!thumbnail) {
          thumbnail = 'https://www.youtube.com/img/desktop/yt_1200.png';
        }

        // Enhanced description with more channel info
        let description = `${video.channel}`;
        if (video.channel_follower_count) {
          description += ` • ${video.channel_follower_count.toLocaleString()} subscribers`;
        }

        // Add channel type indicators
        const channelTypes = [];
        if (channelNameLower.includes(' - topic')) {
          channelTypes.push('Official Artist Channel');
        } else if (channelNameLower.includes('vevo')) {
          channelTypes.push('VEVO Music');
        } else if (channelNameLower.includes('music') || channelNameLower.includes('records')) {
          channelTypes.push('Music Channel');
        }

        if (channelTypes.length > 0) {
          description += ` • ${channelTypes.join(', ')}`;
        }

        // Create channel object with enhanced information
        channelMap.set(video.channel_id, {
          id: video.channel_id,
          title: video.channel,
          description: description,
          thumbnail: thumbnail,
          url: video.channel_url || `https://www.youtube.com/channel/${video.channel_id}`,
          subscriber_count: video.channel_follower_count || 0,
          video_count: null, // We don't have this from search results
          relevance_score: relevanceScore,
          is_topic_channel: channelNameLower.includes(' - topic'),
          is_vevo_channel: channelNameLower.includes('vevo'),
          is_music_channel: channelNameLower.includes('music') || channelNameLower.includes('records') || channelNameLower.includes(' - topic') || channelNameLower.includes('vevo'),
          channel_type: channelTypes.length > 0 ? channelTypes[0] : 'Channel',
          latest_video_title: video.title, // Store latest video as additional info
          latest_video_date: video.upload_date
        });
      }
    });

    // Convert to array and get detailed channel information
    let channels = Array.from(channelMap.values());
    console.log('📊 Found', channels.length, 'unique channels');

    // Step 2: Try to get detailed channel information for subscriber counts
    console.log('🔍 Step 2: Getting detailed channel information...');
    for (let i = 0; i < Math.min(channels.length, 10); i++) { // Limit to first 10 channels to avoid timeout
      const channel = channels[i];
      try {
        if (channel.id) {
          console.log(`🔍 Getting details for channel: ${channel.title} (${channel.id})`);

          // Try to get channel page info
          const channelUrl = `https://www.youtube.com/channel/${channel.id}`;
          const channelInfo = await executeYtDlp(workingPythonCmd, [
            channelUrl,
            '--dump-json',
            '--no-download',
            '--playlist-items', '0' // Don't get videos, just channel info
          ]);

          if (channelInfo && channelInfo.subscriber_count) {
            channel.subscriber_count = channelInfo.subscriber_count;
            console.log(`✅ Updated subscriber count for ${channel.title}: ${channelInfo.subscriber_count}`);
          }

          if (channelInfo && channelInfo.thumbnails && channelInfo.thumbnails.length > 0) {
            // Use the channel's actual avatar if available
            const bestThumb = channelInfo.thumbnails.find(t => t.width >= 240) || channelInfo.thumbnails[0];
            if (bestThumb && bestThumb.url) {
              channel.thumbnail = bestThumb.url;
              console.log(`✅ Updated thumbnail for ${channel.title}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Failed to get details for channel ${channel.title}:`, error.message);
        // Continue with next channel
      }
    }

    // Apply sorting
    switch (sortOrder) {
      case 'music':
        // Prioritize music channels, then by relevance
        channels.sort((a, b) => {
          if (a.is_topic_channel !== b.is_topic_channel) {
            return a.is_topic_channel ? -1 : 1;
          }
          if (a.is_vevo_channel !== b.is_vevo_channel) {
            return a.is_vevo_channel ? -1 : 1;
          }
          if (a.is_music_channel !== b.is_music_channel) {
            return a.is_music_channel ? -1 : 1;
          }
          return a.relevance_score - b.relevance_score;
        });
        break;
      case 'title':
        channels.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'subscribers':
        channels.sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0));
        break;
      case 'relevance':
      default:
        channels.sort((a, b) => a.relevance_score - b.relevance_score);
        break;
    }

    // Implement pagination
    const startIndex = (page - 1) * maxResults;
    const endIndex = startIndex + maxResults;
    const paginatedChannels = channels.slice(startIndex, endIndex);

    // Generate pagination info
    const totalPages = Math.ceil(channels.length / maxResults);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    console.log('📄 Pagination: page', page, 'of', totalPages, '- showing', paginatedChannels.length, 'channels');

    return {
      success: true,
      data: {
        channels: paginatedChannels,
        totalResults: channels.length,
        currentPage: page,
        totalPages: totalPages,
        nextPageToken: hasNextPage ? `page_${page + 1}` : null,
        prevPageToken: hasPrevPage ? `page_${page - 1}` : null,
        resultsPerPage: maxResults
      }
    };

  } catch (error) {
    console.error('❌ yt-dlp channel search failed:', error);

    // Provide helpful error messages
    let errorMessage = error.message || 'Unknown error occurred';

    if (errorMessage.includes('yt-dlp is not installed')) {
      errorMessage = 'yt-dlp is not installed. Please install it with: pip install yt-dlp';
    } else if (errorMessage.includes('command not found') || errorMessage.includes('not found')) {
      errorMessage = 'yt-dlp command not found. Please ensure yt-dlp is installed and accessible.';
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorMessage = 'Network error: Please check your internet connection and try again.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Search timed out. Please try again with a more specific search term.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
});

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get videos from a specific channel using yt-dlp
ipcMain.handle('yt-dlp-channel-videos', async (event, channelId, maxResults = 25, pageToken) => {
  try {
    console.log('🚀 Starting yt-dlp channel videos for:', channelId);

    // First check if yt-dlp is available and get the correct Python command
    const pythonCommands = ['python', 'python3', 'py'];
    let workingPythonCmd = null;

    for (const pythonCmd of pythonCommands) {
      try {
        console.log('🔧 Testing yt-dlp with Python command:', pythonCmd);
        await executeYtDlp(pythonCmd, ['--version']);
        workingPythonCmd = pythonCmd;
        console.log('✅ yt-dlp is available with:', pythonCmd);
        break;
      } catch (error) {
        console.log('⚠️ yt-dlp test failed with:', pythonCmd, error.message);
      }
    }

    if (!workingPythonCmd) {
      throw new Error('yt-dlp not available with any Python command');
    }

    // Build channel URL - handle different channel ID formats
    let channelUrl;
    if (channelId.startsWith('UC') || channelId.startsWith('HC')) {
      // Standard channel ID
      channelUrl = `https://www.youtube.com/channel/${channelId}/videos`;
    } else if (channelId.startsWith('@')) {
      // Handle format
      channelUrl = `https://www.youtube.com/${channelId}/videos`;
    } else {
      // Custom URL or username
      channelUrl = `https://www.youtube.com/c/${channelId}/videos`;
    }

    console.log('🔍 Executing yt-dlp channel videos for URL:', channelUrl);

    // Get channel videos using yt-dlp with anti-detection measures
    console.log(`🔍 Getting videos for channel: ${channelUrl}`);

    // Try multiple strategies to avoid bot detection
    let videoInfos;
    const strategies = [
      // Strategy 1: Use flat-playlist with minimal extraction
      {
        name: 'flat-playlist',
        args: [
          channelUrl,
          '--flat-playlist',
          '--dump-json',
          '--no-download',
          `--playlist-end=${maxResults}`,
          '--extractor-args', 'youtube:skip=dash,hls'
        ]
      },
      // Strategy 2: Use search within channel
      {
        name: 'channel-search',
        args: [
          `ytsearch${maxResults}:site:youtube.com/channel/${channelId}`,
          '--flat-playlist',
          '--dump-json',
          '--no-download'
        ]
      },
      // Strategy 3: Use channel videos URL with minimal extraction
      {
        name: 'videos-url',
        args: [
          `${channelUrl}/videos`,
          '--flat-playlist',
          '--dump-json',
          '--no-download',
          `--playlist-end=${maxResults}`,
          '--extractor-args', 'youtube:skip=dash,hls,translated_subs'
        ]
      }
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        console.log(`🔄 Trying strategy: ${strategy.name}`);
        videoInfos = await executeYtDlp(workingPythonCmd, strategy.args);
        console.log(`✅ Strategy ${strategy.name} succeeded`);
        break;
      } catch (error) {
        console.log(`❌ Strategy ${strategy.name} failed:`, error.message);
        lastError = error;

        // Add delay between attempts to avoid rate limiting
        if (strategy !== strategies[strategies.length - 1]) {
          console.log('⏳ Waiting 2 seconds before next attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!videoInfos) {
      throw lastError || new Error('All strategies failed to get channel videos');
    }

    console.log('📊 yt-dlp returned:', Array.isArray(videoInfos) ? videoInfos.length : 1, 'channel videos');

    // Convert results to our format
    const videos = Array.isArray(videoInfos) ? videoInfos : [videoInfos];

    const convertedVideos = videos.map(video => {
      // Get the best thumbnail available
      let thumbnail = '';

      // Handle different data structures from different strategies
      const videoId = video.id || video.video_id || video.url?.split('v=')[1]?.split('&')[0] || '';

      if (video.thumbnails && Array.isArray(video.thumbnails)) {
        // Try to find the best quality thumbnail
        const bestThumbnail = video.thumbnails.find(t => t.id === 'maxresdefault') ||
                             video.thumbnails.find(t => t.id === 'hqdefault') ||
                             video.thumbnails.find(t => t.id === 'mqdefault') ||
                             video.thumbnails.find(t => t.width >= 480) ||
                             video.thumbnails[video.thumbnails.length - 1]; // Last one is usually highest quality
        thumbnail = bestThumbnail?.url || '';
      } else if (video.thumbnail) {
        thumbnail = video.thumbnail;
      }

      // Fallback to constructed thumbnail URL if none found
      if (!thumbnail && videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      // Handle duration from different sources
      let duration = video.duration || 0;
      let durationString = video.duration_string || '';

      if (!durationString && duration > 0) {
        durationString = formatDuration(duration);
      } else if (!durationString) {
        durationString = '0:00';
      }

      return {
        id: videoId,
        video_id: videoId,
        title: video.title || 'Unknown Title',
        channel: video.channel || video.uploader || video.channel_name || 'Unknown Channel',
        uploader: video.uploader || video.channel || video.channel_name || 'Unknown Channel',
        duration: duration,
        duration_string: durationString,
        thumbnail: thumbnail,
        thumbnails: video.thumbnails || [],
        description: video.description || '',
        upload_date: video.upload_date || video.timestamp || '',
        view_count: video.view_count || 0,
        like_count: video.like_count || 0,
        url: video.url || `https://www.youtube.com/watch?v=${videoId}`
      };
    });

    return {
      success: true,
      data: {
        videos: convertedVideos,
        totalResults: convertedVideos.length,
        nextPageToken: null, // yt-dlp doesn't provide pagination tokens
        prevPageToken: null
      }
    };

  } catch (error) {
    console.error('❌ yt-dlp channel videos failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Get video details using yt-dlp
ipcMain.handle('yt-dlp-get-video-details', async (event, videoId) => {
  try {
    console.log('🎬 Getting video details for:', videoId);

    // First check if yt-dlp is available and get the correct Python command
    const pythonCommands = ['python', 'python3', 'py'];
    let workingPythonCmd = null;

    for (const pythonCmd of pythonCommands) {
      try {
        await executeYtDlp(pythonCmd, ['--version']);
        workingPythonCmd = pythonCmd;
        break;
      } catch (error) {
        // Continue to next command
      }
    }

    if (!workingPythonCmd) {
      throw new Error('yt-dlp not available with any Python command');
    }

    const videoInfo = await executeYtDlp(workingPythonCmd, [
      `https://www.youtube.com/watch?v=${videoId}`,
      '--dump-json',
      '--no-download'
    ]);

    return {
      success: true,
      data: videoInfo
    };

  } catch (error) {
    console.error('❌ Failed to get video details:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Get playlist videos using yt-dlp
ipcMain.handle('yt-dlp-get-playlist-videos', async (event, playlistId, maxResults = 50) => {
  try {
    console.log('🎵 Getting playlist videos for:', playlistId, 'maxResults:', maxResults);

    // First check if yt-dlp is available and get the correct Python command
    const pythonCommands = ['python', 'python3', 'py'];
    let workingPythonCmd = null;

    for (const pythonCmd of pythonCommands) {
      try {
        await executeYtDlp(pythonCmd, ['--version']);
        workingPythonCmd = pythonCmd;
        break;
      } catch (error) {
        // Continue to next command
      }
    }

    if (!workingPythonCmd) {
      throw new Error('yt-dlp not available with any Python command');
    }

    // Construct playlist URL
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    console.log('🔍 Extracting playlist:', playlistUrl);

    // Get playlist information using yt-dlp
    const playlistInfo = await executeYtDlp(workingPythonCmd, [
      playlistUrl,
      '--flat-playlist',
      '--dump-json',
      '--no-download',
      `--playlist-end=${maxResults}`,
      '--extractor-args', 'youtube:skip=dash,hls'
    ]);

    console.log('📊 yt-dlp returned playlist data');

    // Process the results
    const results = Array.isArray(playlistInfo) ? playlistInfo : [playlistInfo];

    // Filter out the playlist metadata entry and keep only video entries
    const videoEntries = results.filter(item =>
      item &&
      item.id &&
      item._type !== 'playlist' &&
      !item.entries // This filters out the main playlist object
    );

    console.log(`✅ Successfully extracted ${videoEntries.length} videos from playlist`);

    return {
      success: true,
      data: videoEntries,
      totalVideos: videoEntries.length
    };

  } catch (error) {
    console.error('❌ yt-dlp get playlist videos failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
