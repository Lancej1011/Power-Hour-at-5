interface UIPreferences {
  playlistCardSize: number; // Playlist card width in pixels
  musicLibraryWidth: number; // Music library table width as percentage
}

const STORAGE_KEY = 'power_hour_ui_preferences';

const DEFAULT_PREFERENCES: UIPreferences = {
  playlistCardSize: 320, // Default card size
  musicLibraryWidth: 80, // Default library width percentage
};

class UIPreferencesManager {
  private static instance: UIPreferencesManager;
  private preferences: UIPreferences = DEFAULT_PREFERENCES;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): UIPreferencesManager {
    if (!UIPreferencesManager.instance) {
      UIPreferencesManager.instance = new UIPreferencesManager();
    }
    return UIPreferencesManager.instance;
  }

  // Load preferences from localStorage
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading UI preferences from storage:', error);
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  // Save preferences to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving UI preferences to storage:', error);
    }
  }

  // Get all preferences
  getPreferences(): UIPreferences {
    return { ...this.preferences };
  }

  // Get playlist card size
  getPlaylistCardSize(): number {
    return this.preferences.playlistCardSize;
  }

  // Set playlist card size
  setPlaylistCardSize(size: number): void {
    this.preferences.playlistCardSize = Math.max(180, Math.min(500, size)); // Constrain to valid range
    this.saveToStorage();
  }

  // Get music library width
  getMusicLibraryWidth(): number {
    return this.preferences.musicLibraryWidth;
  }

  // Set music library width
  setMusicLibraryWidth(width: number): void {
    this.preferences.musicLibraryWidth = Math.max(50, Math.min(98, width)); // Constrain to valid range
    this.saveToStorage();
  }

  // Update multiple preferences at once
  updatePreferences(updates: Partial<UIPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.saveToStorage();
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.saveToStorage();
  }
}

export default UIPreferencesManager;
