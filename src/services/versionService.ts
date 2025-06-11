/**
 * Version Management Service for PHat5
 * Handles version history, backups, and rollback functionality
 */

export interface VersionInfo {
  version: string;
  buildDate: string;
  installDate: string;
  backupPath?: string;
  releaseNotes?: string;
  size?: number;
  isCurrentVersion: boolean;
  canRollback: boolean;
}

export interface BackupInfo {
  version: string;
  backupPath: string;
  backupDate: string;
  size: number;
  userDataBackup?: string;
}

class VersionService {
  private versionHistory: VersionInfo[] = [];
  private currentVersion: string = '1.0.0';

  constructor() {
    this.loadVersionHistory();
    this.getCurrentVersion();
  }

  /**
   * Initialize the version service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing version management service');
      
      // Get current version from main process
      if (window.electronAPI?.getCurrentVersion) {
        this.currentVersion = await window.electronAPI.getCurrentVersion();
      }

      // Load version history
      await this.loadVersionHistory();
      
      // Ensure current version is in history
      await this.recordCurrentVersion();
      
      console.log(`✅ Version service initialized - Current: ${this.currentVersion}`);
    } catch (error) {
      console.error('❌ Failed to initialize version service:', error);
    }
  }

  /**
   * Get current application version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get version history
   */
  getVersionHistory(): VersionInfo[] {
    return [...this.versionHistory].sort((a, b) => 
      new Date(b.installDate).getTime() - new Date(a.installDate).getTime()
    );
  }

  /**
   * Record a new version installation
   */
  async recordVersionInstall(version: string, releaseNotes?: string): Promise<void> {
    try {
      console.log(`📝 Recording version install: ${version}`);

      // Create backup of previous version if it exists
      const previousVersion = this.versionHistory.find(v => v.isCurrentVersion);
      if (previousVersion) {
        await this.createVersionBackup(previousVersion.version);
        previousVersion.isCurrentVersion = false;
      }

      // Add new version to history
      const newVersion: VersionInfo = {
        version,
        buildDate: new Date().toISOString(),
        installDate: new Date().toISOString(),
        releaseNotes,
        isCurrentVersion: true,
        canRollback: false, // Current version can't be rolled back to
      };

      this.versionHistory.push(newVersion);
      this.currentVersion = version;

      // Enable rollback for previous versions
      this.versionHistory.forEach(v => {
        if (!v.isCurrentVersion && v.backupPath) {
          v.canRollback = true;
        }
      });

      await this.saveVersionHistory();
      console.log(`✅ Version ${version} recorded successfully`);
    } catch (error) {
      console.error('❌ Failed to record version install:', error);
    }
  }

  /**
   * Create backup of current version before update
   */
  async createVersionBackup(version: string): Promise<BackupInfo | null> {
    try {
      console.log(`💾 Creating backup for version ${version}`);

      if (!window.electronAPI?.createVersionBackup) {
        console.warn('⚠️ Version backup not available');
        return null;
      }

      const backup = await window.electronAPI.createVersionBackup(version);
      
      if (backup) {
        // Update version history with backup info
        const versionInfo = this.versionHistory.find(v => v.version === version);
        if (versionInfo) {
          versionInfo.backupPath = backup.backupPath;
          versionInfo.size = backup.size;
          versionInfo.canRollback = true;
        }

        await this.saveVersionHistory();
        console.log(`✅ Backup created for version ${version}`);
        return backup;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to create backup for version ${version}:`, error);
      return null;
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(targetVersion: string): Promise<boolean> {
    try {
      console.log(`🔄 Rolling back to version ${targetVersion}`);

      const targetVersionInfo = this.versionHistory.find(v => v.version === targetVersion);
      if (!targetVersionInfo) {
        throw new Error(`Version ${targetVersion} not found in history`);
      }

      if (!targetVersionInfo.canRollback) {
        throw new Error(`Version ${targetVersion} cannot be rolled back to`);
      }

      if (!targetVersionInfo.backupPath) {
        throw new Error(`No backup available for version ${targetVersion}`);
      }

      if (!window.electronAPI?.rollbackToVersion) {
        throw new Error('Rollback functionality not available');
      }

      // Create backup of current version before rollback
      await this.createVersionBackup(this.currentVersion);

      // Perform rollback
      const success = await window.electronAPI.rollbackToVersion(
        targetVersion,
        targetVersionInfo.backupPath
      );

      if (success) {
        console.log(`✅ Successfully rolled back to version ${targetVersion}`);
        
        // Update version history
        this.versionHistory.forEach(v => {
          v.isCurrentVersion = v.version === targetVersion;
        });

        this.currentVersion = targetVersion;
        await this.saveVersionHistory();

        return true;
      } else {
        throw new Error('Rollback operation failed');
      }
    } catch (error) {
      console.error(`❌ Rollback to version ${targetVersion} failed:`, error);
      return false;
    }
  }

  /**
   * Delete version backup
   */
  async deleteVersionBackup(version: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting backup for version ${version}`);

      const versionInfo = this.versionHistory.find(v => v.version === version);
      if (!versionInfo || !versionInfo.backupPath) {
        console.warn(`No backup found for version ${version}`);
        return false;
      }

      if (!window.electronAPI?.deleteVersionBackup) {
        console.warn('⚠️ Backup deletion not available');
        return false;
      }

      const success = await window.electronAPI.deleteVersionBackup(versionInfo.backupPath);
      
      if (success) {
        // Update version history
        versionInfo.backupPath = undefined;
        versionInfo.canRollback = false;
        versionInfo.size = undefined;

        await this.saveVersionHistory();
        console.log(`✅ Backup deleted for version ${version}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Failed to delete backup for version ${version}:`, error);
      return false;
    }
  }

  /**
   * Clean up old version backups (keep only last N versions)
   */
  async cleanupOldBackups(keepCount: number = 3): Promise<void> {
    try {
      console.log(`🧹 Cleaning up old backups (keeping ${keepCount} versions)`);

      const sortedVersions = this.getVersionHistory();
      const versionsToCleanup = sortedVersions.slice(keepCount);

      for (const version of versionsToCleanup) {
        if (version.backupPath && !version.isCurrentVersion) {
          await this.deleteVersionBackup(version.version);
        }
      }

      console.log(`✅ Cleanup completed - removed ${versionsToCleanup.length} old backups`);
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get total size of all backups
   */
  getTotalBackupSize(): number {
    return this.versionHistory.reduce((total, version) => {
      return total + (version.size || 0);
    }, 0);
  }

  /**
   * Check if version can be rolled back to
   */
  canRollbackTo(version: string): boolean {
    const versionInfo = this.versionHistory.find(v => v.version === version);
    return versionInfo?.canRollback || false;
  }

  /**
   * Record current version in history
   */
  private async recordCurrentVersion(): Promise<void> {
    const existingVersion = this.versionHistory.find(v => v.version === this.currentVersion);
    if (!existingVersion) {
      const currentVersionInfo: VersionInfo = {
        version: this.currentVersion,
        buildDate: new Date().toISOString(),
        installDate: new Date().toISOString(),
        isCurrentVersion: true,
        canRollback: false,
      };

      this.versionHistory.push(currentVersionInfo);
      await this.saveVersionHistory();
    } else {
      existingVersion.isCurrentVersion = true;
    }
  }

  /**
   * Load version history from storage
   */
  private async loadVersionHistory(): Promise<void> {
    try {
      // Try to load from electron store first
      if (window.electronAPI?.getVersionHistory) {
        const history = await window.electronAPI.getVersionHistory();
        if (history && history.length > 0) {
          this.versionHistory = history;
          return;
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('phat5-version-history');
      if (saved) {
        this.versionHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load version history:', error);
      this.versionHistory = [];
    }
  }

  /**
   * Save version history to storage
   */
  private async saveVersionHistory(): Promise<void> {
    try {
      // Save to electron store if available
      if (window.electronAPI?.saveVersionHistory) {
        await window.electronAPI.saveVersionHistory(this.versionHistory);
      }

      // Also save to localStorage as backup
      localStorage.setItem('phat5-version-history', JSON.stringify(this.versionHistory));
    } catch (error) {
      console.warn('Failed to save version history:', error);
    }
  }
}

// Export singleton instance
export const versionService = new VersionService();
