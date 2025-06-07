interface VolumeSettings {
  mixVolume: number;
  playlistVolume: number;
  visualizerVolume: number;
  previewVolume: number;
  mixMuted: boolean;
  playlistMuted: boolean;
  visualizerMuted: boolean;
  previewMuted: boolean;
}

const VOLUME_STORAGE_KEY = 'power_hour_volume_settings';

const DEFAULT_VOLUME_SETTINGS: VolumeSettings = {
  mixVolume: 1,
  playlistVolume: 1,
  visualizerVolume: 1,
  previewVolume: 1,
  mixMuted: false,
  playlistMuted: false,
  visualizerMuted: false,
  previewMuted: false,
};

class VolumeManager {
  private static instance: VolumeManager;
  private settings: VolumeSettings = DEFAULT_VOLUME_SETTINGS;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): VolumeManager {
    if (!VolumeManager.instance) {
      VolumeManager.instance = new VolumeManager();
    }
    return VolumeManager.instance;
  }

  // Load volume settings from localStorage
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_VOLUME_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading volume settings from storage:', error);
      this.settings = DEFAULT_VOLUME_SETTINGS;
    }
  }

  // Save volume settings to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving volume settings to storage:', error);
    }
  }

  // Get all volume settings
  getVolumeSettings(): VolumeSettings {
    return { ...this.settings };
  }

  // Mix volume methods
  getMixVolume(): number {
    return this.settings.mixVolume;
  }

  setMixVolume(volume: number): void {
    this.settings.mixVolume = Math.max(0, Math.min(1, volume));
    this.saveToStorage();
  }

  getMixMuted(): boolean {
    return this.settings.mixMuted;
  }

  setMixMuted(muted: boolean): void {
    this.settings.mixMuted = muted;
    this.saveToStorage();
  }

  // Playlist volume methods
  getPlaylistVolume(): number {
    return this.settings.playlistVolume;
  }

  setPlaylistVolume(volume: number): void {
    this.settings.playlistVolume = Math.max(0, Math.min(1, volume));
    this.saveToStorage();
  }

  getPlaylistMuted(): boolean {
    return this.settings.playlistMuted;
  }

  setPlaylistMuted(muted: boolean): void {
    this.settings.playlistMuted = muted;
    this.saveToStorage();
  }

  // Visualizer volume methods
  getVisualizerVolume(): number {
    return this.settings.visualizerVolume;
  }

  setVisualizerVolume(volume: number): void {
    this.settings.visualizerVolume = Math.max(0, Math.min(1, volume));
    this.saveToStorage();
  }

  getVisualizerMuted(): boolean {
    return this.settings.visualizerMuted;
  }

  setVisualizerMuted(muted: boolean): void {
    this.settings.visualizerMuted = muted;
    this.saveToStorage();
  }

  // Preview volume methods
  getPreviewVolume(): number {
    return this.settings.previewVolume;
  }

  setPreviewVolume(volume: number): void {
    this.settings.previewVolume = Math.max(0, Math.min(1, volume));
    this.saveToStorage();
  }

  getPreviewMuted(): boolean {
    return this.settings.previewMuted;
  }

  setPreviewMuted(muted: boolean): void {
    this.settings.previewMuted = muted;
    this.saveToStorage();
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_VOLUME_SETTINGS };
    this.saveToStorage();
  }
}

export default VolumeManager;
export type { VolumeSettings };
