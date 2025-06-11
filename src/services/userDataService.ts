/**
 * User Data Service
 * Handles synchronization of user data between local storage and Firestore
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { authService } from './authService';
import { 
  UserProfile, 
  UserPreferences, 
  DEFAULT_USER_PREFERENCES,
  AUTH_STORAGE_KEYS 
} from '../types/auth';
import { 
  mergeUserPreferences,
  saveToLocalStorage,
  loadFromLocalStorage 
} from '../utils/authUtils';

// Firestore collection names
const COLLECTIONS = {
  USERS: 'users',
  USER_PREFERENCES: 'user_preferences',
  USER_DATA_SYNC: 'user_data_sync'
} as const;

// Sync status interface
export interface SyncStatus {
  lastSyncAt: Date | null;
  pendingChanges: boolean;
  syncInProgress: boolean;
  lastError: string | null;
}

// User data sync record
export interface UserDataSyncRecord {
  userId: string;
  profileLastModified: Timestamp;
  preferencesLastModified: Timestamp;
  lastSyncAt: Timestamp;
  syncVersion: number;
}

export class UserDataService {
  private static instance: UserDataService;
  private syncInProgress = false;
  private pendingSync: Promise<void> | null = null;

  private constructor() {}

  // Singleton pattern
  public static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService();
    }
    return UserDataService.instance;
  }

  // Check if Firebase is available
  public isAvailable(): boolean {
    return isFirebaseConfigured() && !!db;
  }

  // Get current sync status
  public getSyncStatus(): SyncStatus {
    const lastSyncAt = loadFromLocalStorage<Date>(AUTH_STORAGE_KEYS.LAST_SYNC);
    const pendingData = loadFromLocalStorage<any[]>(AUTH_STORAGE_KEYS.PENDING_SYNC) || [];
    
    return {
      lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : null,
      pendingChanges: pendingData.length > 0,
      syncInProgress: this.syncInProgress,
      lastError: null
    };
  }

  // Sync user profile to Firestore
  public async syncUserProfile(profile: UserProfile): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('🔄 Firebase not available - saving profile to pending sync');
      this.addToPendingSync('profile', profile);
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('No authenticated user - cannot sync profile');
      return false;
    }

    try {
      const userRef = doc(db!, COLLECTIONS.USERS, currentUser.uid);
      const syncData = {
        ...profile,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userRef, syncData, { merge: true });
      
      // Update sync record
      await this.updateSyncRecord('profile');
      
      console.log('✅ User profile synced to Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error syncing user profile:', error);
      this.addToPendingSync('profile', profile);
      return false;
    }
  }

  // Sync user preferences to Firestore
  public async syncUserPreferences(preferences: UserPreferences): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('🔄 Firebase not available - saving preferences to pending sync');
      this.addToPendingSync('preferences', preferences);
      return false;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.warn('No authenticated user - cannot sync preferences');
      return false;
    }

    try {
      const prefsRef = doc(db!, COLLECTIONS.USER_PREFERENCES, currentUser.uid);
      const syncData = {
        ...preferences,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(prefsRef, syncData, { merge: true });
      
      // Update sync record
      await this.updateSyncRecord('preferences');
      
      console.log('✅ User preferences synced to Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error syncing user preferences:', error);
      this.addToPendingSync('preferences', preferences);
      return false;
    }
  }

  // Load user profile from Firestore
  public async loadUserProfile(): Promise<UserProfile | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const userRef = doc(db!, COLLECTIONS.USERS, currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ Loaded user profile from Firestore');
        return data as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      return null;
    }
  }

  // Load user preferences from Firestore
  public async loadUserPreferences(): Promise<UserPreferences | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const prefsRef = doc(db!, COLLECTIONS.USER_PREFERENCES, currentUser.uid);
      const prefsDoc = await getDoc(prefsRef);
      
      if (prefsDoc.exists()) {
        const data = prefsDoc.data();
        console.log('✅ Loaded user preferences from Firestore');
        return mergeUserPreferences(data as UserPreferences);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
      return null;
    }
  }

  // Full user data sync (bidirectional)
  public async syncAllUserData(): Promise<{ success: boolean; errors: string[] }> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, waiting...');
      if (this.pendingSync) {
        await this.pendingSync;
      }
      return { success: true, errors: [] };
    }

    this.syncInProgress = true;
    const errors: string[] = [];

    try {
      console.log('🔄 Starting full user data sync...');

      // Load local data
      const localProfile = loadFromLocalStorage<UserProfile>(AUTH_STORAGE_KEYS.USER_PROFILE);
      const localPreferences = loadFromLocalStorage<UserPreferences>(AUTH_STORAGE_KEYS.USER_PREFERENCES);

      // Load remote data
      const remoteProfile = await this.loadUserProfile();
      const remotePreferences = await this.loadUserPreferences();

      // Sync profile
      if (localProfile) {
        const profileSynced = await this.syncUserProfile(localProfile);
        if (!profileSynced) {
          errors.push('Failed to sync user profile');
        }
      } else if (remoteProfile) {
        // Use remote profile if no local profile
        saveToLocalStorage(AUTH_STORAGE_KEYS.USER_PROFILE, remoteProfile);
        console.log('✅ Downloaded user profile from Firestore');
      }

      // Sync preferences
      if (localPreferences) {
        const preferencesSynced = await this.syncUserPreferences(localPreferences);
        if (!preferencesSynced) {
          errors.push('Failed to sync user preferences');
        }
      } else if (remotePreferences) {
        // Use remote preferences if no local preferences
        saveToLocalStorage(AUTH_STORAGE_KEYS.USER_PREFERENCES, remotePreferences);
        console.log('✅ Downloaded user preferences from Firestore');
      } else {
        // Create default preferences if none exist
        const defaultPrefs = DEFAULT_USER_PREFERENCES;
        saveToLocalStorage(AUTH_STORAGE_KEYS.USER_PREFERENCES, defaultPrefs);
        await this.syncUserPreferences(defaultPrefs);
        console.log('✅ Created default user preferences');
      }

      // Process pending sync items
      await this.processPendingSync();

      // Update last sync time
      const now = new Date();
      saveToLocalStorage(AUTH_STORAGE_KEYS.LAST_SYNC, now);

      console.log('✅ Full user data sync completed');
      return { success: errors.length === 0, errors };

    } catch (error) {
      console.error('❌ Error during full user data sync:', error);
      errors.push(`Sync failed: ${error}`);
      return { success: false, errors };
    } finally {
      this.syncInProgress = false;
      this.pendingSync = null;
    }
  }

  // Add data to pending sync queue
  private addToPendingSync(type: 'profile' | 'preferences', data: any): void {
    try {
      const pending = loadFromLocalStorage<any[]>(AUTH_STORAGE_KEYS.PENDING_SYNC) || [];
      const existingIndex = pending.findIndex(item => item.type === type);
      
      const syncItem = {
        type,
        data,
        timestamp: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        pending[existingIndex] = syncItem;
      } else {
        pending.push(syncItem);
      }

      saveToLocalStorage(AUTH_STORAGE_KEYS.PENDING_SYNC, pending);
      console.log(`📝 Added ${type} to pending sync queue`);
    } catch (error) {
      console.error('Error adding to pending sync:', error);
    }
  }

  // Process pending sync items
  private async processPendingSync(): Promise<void> {
    try {
      const pending = loadFromLocalStorage<any[]>(AUTH_STORAGE_KEYS.PENDING_SYNC) || [];
      if (pending.length === 0) return;

      console.log(`🔄 Processing ${pending.length} pending sync items...`);

      for (const item of pending) {
        try {
          if (item.type === 'profile') {
            await this.syncUserProfile(item.data);
          } else if (item.type === 'preferences') {
            await this.syncUserPreferences(item.data);
          }
        } catch (error) {
          console.error(`Failed to sync pending ${item.type}:`, error);
        }
      }

      // Clear pending sync queue
      saveToLocalStorage(AUTH_STORAGE_KEYS.PENDING_SYNC, []);
      console.log('✅ Processed all pending sync items');

    } catch (error) {
      console.error('Error processing pending sync:', error);
    }
  }

  // Update sync record in Firestore
  private async updateSyncRecord(dataType: 'profile' | 'preferences'): Promise<void> {
    if (!this.isAvailable()) return;

    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    try {
      const syncRef = doc(db!, COLLECTIONS.USER_DATA_SYNC, currentUser.uid);
      const updateData: any = {
        userId: currentUser.uid,
        lastSyncAt: serverTimestamp(),
        syncVersion: 1
      };

      if (dataType === 'profile') {
        updateData.profileLastModified = serverTimestamp();
      } else if (dataType === 'preferences') {
        updateData.preferencesLastModified = serverTimestamp();
      }

      await setDoc(syncRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating sync record:', error);
    }
  }

  // Clear all local user data
  public clearLocalUserData(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER_PREFERENCES);
      localStorage.removeItem(AUTH_STORAGE_KEYS.LAST_SYNC);
      localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_SYNC);
      console.log('✅ Cleared all local user data');
    } catch (error) {
      console.error('Error clearing local user data:', error);
    }
  }
}

// Export singleton instance
export const userDataService = UserDataService.getInstance();
