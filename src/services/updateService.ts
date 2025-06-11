/**
 * Auto-Update Service for PHat5
 * Handles checking for updates, downloading, and installing updates
 */

import { config } from '../config/environment';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl?: string;
  mandatory?: boolean;
  size?: number;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdateStatus {
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  checking: boolean;
  error?: string;
  updateInfo?: UpdateInfo;
  progress?: UpdateProgress;
}

export interface UpdateSettings {
  autoCheck: boolean;
  checkInterval: number; // hours
  autoDownload: boolean;
  autoInstall: boolean;
  allowPrerelease: boolean;
  lastChecked?: number;
}

class UpdateService {
  private status: UpdateStatus = {
    available: false,
    downloaded: false,
    downloading: false,
    checking: false,
  };

  private settings: UpdateSettings = {
    autoCheck: true,
    checkInterval: 24, // Check every 24 hours
    autoDownload: true,
    autoInstall: false, // Require user confirmation
    allowPrerelease: false,
  };

  private listeners: Array<(status: UpdateStatus) => void> = [];
  private checkTimer?: NodeJS.Timeout;

  constructor() {
    this.loadSettings();
    this.setupAutoCheck();
  }

  /**
   * Initialize the update service
   */
  async initialize(): Promise<void> {
    try {
      // Only enable auto-updates in production
      if (!config.isProduction) {
        console.log('🔄 Auto-updates disabled in development mode');
        return;
      }

      // Check if electron-updater is available
      if (!window.electronAPI?.checkForUpdates) {
        console.warn('⚠️ Auto-updater not available - running in web mode?');
        return;
      }

      console.log('🚀 Initializing auto-updater service');
      
      // Setup event listeners for update events
      this.setupUpdateListeners();

      // Perform initial update check if auto-check is enabled
      if (this.settings.autoCheck) {
        setTimeout(() => this.checkForUpdates(), 5000); // Check after 5 seconds
      }
    } catch (error) {
      console.error('❌ Failed to initialize update service:', error);
      this.updateStatus({ error: 'Failed to initialize updater' });
    }
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(manual: boolean = false): Promise<UpdateInfo | null> {
    try {
      if (this.status.checking) {
        console.log('🔄 Update check already in progress');
        return null;
      }

      console.log('🔍 Checking for updates...');
      this.updateStatus({ checking: true, error: undefined });

      // Check if we're in Electron environment
      if (!window.electronAPI?.checkForUpdates) {
        throw new Error('Auto-updater not available');
      }

      const result = await window.electronAPI.checkForUpdates();
      
      if (result.available) {
        console.log('✅ Update available:', result.version);
        this.updateStatus({
          checking: false,
          available: true,
          updateInfo: result,
        });

        // Auto-download if enabled
        if (this.settings.autoDownload && !manual) {
          this.downloadUpdate();
        }

        return result;
      } else {
        console.log('✅ No updates available');
        this.updateStatus({
          checking: false,
          available: false,
        });
        return null;
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
      this.updateStatus({
        checking: false,
        error: error instanceof Error ? error.message : 'Update check failed',
      });
      return null;
    } finally {
      this.settings.lastChecked = Date.now();
      this.saveSettings();
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate(): Promise<void> {
    try {
      if (!this.status.available || this.status.downloading) {
        return;
      }

      console.log('⬇️ Starting update download...');
      this.updateStatus({ downloading: true, error: undefined });

      if (!window.electronAPI?.downloadUpdate) {
        throw new Error('Download functionality not available');
      }

      await window.electronAPI.downloadUpdate();
      
      console.log('✅ Update downloaded successfully');
      this.updateStatus({
        downloading: false,
        downloaded: true,
      });

      // Auto-install if enabled
      if (this.settings.autoInstall) {
        this.installUpdate();
      }
    } catch (error) {
      console.error('❌ Update download failed:', error);
      this.updateStatus({
        downloading: false,
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  }

  /**
   * Install downloaded update and restart application
   */
  async installUpdate(): Promise<void> {
    try {
      if (!this.status.downloaded) {
        throw new Error('No update downloaded');
      }

      console.log('🔄 Installing update and restarting...');

      if (!window.electronAPI?.installUpdate) {
        throw new Error('Install functionality not available');
      }

      // This will restart the application
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('❌ Update installation failed:', error);
      this.updateStatus({
        error: error instanceof Error ? error.message : 'Installation failed',
      });
    }
  }

  /**
   * Get current update status
   */
  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Get update settings
   */
  getSettings(): UpdateSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<UpdateSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.setupAutoCheck();
  }

  /**
   * Subscribe to status updates
   */
  subscribe(listener: (status: UpdateStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Setup automatic update checking
   */
  private setupAutoCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    if (this.settings.autoCheck && config.isProduction) {
      const intervalMs = this.settings.checkInterval * 60 * 60 * 1000; // Convert hours to ms
      this.checkTimer = setInterval(() => {
        this.checkForUpdates();
      }, intervalMs);
    }
  }

  /**
   * Setup event listeners for update events from main process
   */
  private setupUpdateListeners(): void {
    // Listen for update progress events
    if (window.electronAPI?.onUpdateProgress) {
      window.electronAPI.onUpdateProgress((progress: UpdateProgress) => {
        this.updateStatus({ progress });
      });
    }

    // Listen for update downloaded events
    if (window.electronAPI?.onUpdateDownloaded) {
      window.electronAPI.onUpdateDownloaded(() => {
        this.updateStatus({
          downloading: false,
          downloaded: true,
        });
      });
    }

    // Listen for update errors
    if (window.electronAPI?.onUpdateError) {
      window.electronAPI.onUpdateError((error: string) => {
        this.updateStatus({
          checking: false,
          downloading: false,
          error,
        });
      });
    }
  }

  /**
   * Update internal status and notify listeners
   */
  private updateStatus(updates: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...updates };
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('phat5-update-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load update settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('phat5-update-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save update settings:', error);
    }
  }
}

// Export singleton instance
export const updateService = new UpdateService();
