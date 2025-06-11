import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updatePassword as firebaseUpdatePassword,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { UserPreferences } from '../types/auth';
import { createAdminProfile } from '../utils/authUtils';

// User profile interface
export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  createdAt: any; // Firestore timestamp
  isAnonymous: boolean;
  lastLoginAt: any; // Firestore timestamp
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  private constructor() {
    // Set up auth state listener if Firebase is configured
    if (auth) {
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        this.notifyAuthStateListeners(user);
      });
    }
  }

  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Check if Firebase is available
  public isFirebaseAvailable(): boolean {
    return isFirebaseConfigured() && !!auth && !!db;
  }



  // Sign in with Google
  public async signInWithGoogle(): Promise<User | null> {
    if (!this.isFirebaseAvailable()) {
      console.warn('Firebase not available - cannot sign in with Google');
      return null;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth!, provider);
      await this.createOrUpdateUserProfile(result.user, false);
      console.log('✅ Signed in with Google');
      return result.user;
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      throw error;
    }
  }

  // Sign in anonymously
  public async signInAnonymously(): Promise<User | null> {
    if (!this.isFirebaseAvailable()) {
      console.warn('Firebase not available - cannot sign in anonymously');
      return null;
    }

    try {
      const result = await firebaseSignInAnonymously(auth!);
      await this.createOrUpdateUserProfile(result.user, true);
      console.log('✅ Signed in anonymously');
      return result.user;
    } catch (error) {
      console.error('❌ Error signing in anonymously:', error);
      throw error;
    }
  }

  // Create user with email and password
  public async createUserWithEmailAndPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<User | null> {
    if (!this.isFirebaseAvailable()) {
      console.warn('Firebase not available - cannot create user with email');
      return null;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth!, email, password);

      // Update display name if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      await this.createOrUpdateUserProfile(result.user, false);

      // Send email verification
      await this.sendEmailVerification();


      return result.user;
    } catch (error) {

      throw error;
    }
  }

  // Sign in with email and password
  public async signInWithEmailAndPassword(email: string, password: string): Promise<User | null> {
    if (!this.isFirebaseAvailable()) {
      return null;
    }

    try {
      const result = await signInWithEmailAndPassword(auth!, email, password);
      await this.createOrUpdateUserProfile(result.user, false);

      return result.user;
    } catch (error) {

      throw error;
    }
  }

  // Send password reset email
  public async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      console.warn('Firebase not available - cannot send password reset email');
      return;
    }

    try {
      await firebaseSendPasswordResetEmail(auth!, email);
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }

  // Send email verification
  public async sendEmailVerification(): Promise<void> {
    if (!this.isFirebaseAvailable() || !this.currentUser) {
      console.warn('Firebase not available or no user - cannot send email verification');
      return;
    }

    try {
      await firebaseSendEmailVerification(this.currentUser);
      console.log('✅ Email verification sent');
    } catch (error) {
      console.error('❌ Error sending email verification:', error);
      throw error;
    }
  }

  // Update password
  public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.isFirebaseAvailable() || !this.currentUser) {
      console.warn('Firebase not available or no user - cannot update password');
      return;
    }

    try {
      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(
        this.currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(this.currentUser, credential);

      // Update password
      await firebaseUpdatePassword(this.currentUser, newPassword);
      console.log('✅ Password updated successfully');
    } catch (error) {
      console.error('❌ Error updating password:', error);
      throw error;
    }
  }

  // Link anonymous account to email account
  public async linkAnonymousToEmail(email: string, password: string): Promise<User | null> {
    if (!this.isFirebaseAvailable() || !this.currentUser) {
      console.warn('Firebase not available or no user - cannot link account');
      return null;
    }

    if (!this.currentUser.isAnonymous) {
      console.warn('User is not anonymous - cannot link account');
      return null;
    }

    try {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(this.currentUser, credential);

      await this.createOrUpdateUserProfile(result.user, false);

      // Send email verification
      await this.sendEmailVerification();

      console.log('✅ Anonymous account linked to email');
      return result.user;
    } catch (error) {
      console.error('❌ Error linking anonymous account to email:', error);
      throw error;
    }
  }

  // Check if account can be linked
  public canLinkAccount(): boolean {
    return this.currentUser?.isAnonymous || false;
  }

  // Sign out
  public async signOut(): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      console.warn('Firebase not available - cannot sign out');
      return;
    }

    try {
      await firebaseSignOut(auth!);
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  }

  // Get current user
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current user ID
  public getCurrentUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // Check if user is anonymous
  public isAnonymous(): boolean {
    return this.currentUser?.isAnonymous || false;
  }

  // Get user profile from Firestore
  public async getUserProfile(): Promise<UserProfile | null> {
    if (!this.isFirebaseAvailable() || !this.currentUser) {
      return null;
    }

    try {
      const userRef = doc(db!, 'users', this.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  // Create or update user profile
  private async createOrUpdateUserProfile(user: User, isAnonymous: boolean): Promise<void> {
    if (!this.isFirebaseAvailable()) {
      return;
    }

    try {
      const userRef = doc(db!, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      const now = serverTimestamp();

      if (!userDoc.exists()) {
        // Create new user profile
        const userProfile: Partial<UserProfile> = {
          id: user.uid,
          username: user.displayName || `User${Math.floor(Math.random() * 10000)}`,
          email: user.email || undefined,
          createdAt: now,
          isAnonymous,
          lastLoginAt: now,
          // Add admin permissions if user is an admin
          ...createAdminProfile(user.uid, user.email || undefined)
        };

        await setDoc(userRef, userProfile);
        console.log('✅ Created user profile');
      } else {
        // Update last login time
        await setDoc(userRef, {
          lastLoginAt: now
        }, { merge: true });
        console.log('✅ Updated user profile');
      }
    } catch (error) {
      console.error('❌ Error creating/updating user profile:', error);
    }
  }

  // Update user profile in Firestore
  public async updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
    if (!this.isFirebaseAvailable() || !db) {
      console.warn('Firebase not available - cannot update user profile');
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.warn('No authenticated user - cannot update profile');
      return false;
    }

    try {
      const userRef = doc(db!, 'users', currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, updateData, { merge: true });
      console.log('✅ User profile updated in Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      return false;
    }
  }

  // Get user preferences from Firestore
  public async getUserPreferences(): Promise<UserPreferences | null> {
    if (!this.isFirebaseAvailable() || !db) {
      return null;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const prefsRef = doc(db!, 'user_preferences', currentUser.uid);
      const prefsDoc = await getDoc(prefsRef);

      if (prefsDoc.exists()) {
        const data = prefsDoc.data();
        console.log('✅ Loaded user preferences from Firestore');
        return data as UserPreferences;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      return null;
    }
  }

  // Update user preferences in Firestore
  public async updateUserPreferences(preferences: UserPreferences): Promise<boolean> {
    if (!this.isFirebaseAvailable() || !db) {
      console.warn('Firebase not available - cannot update user preferences');
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.warn('No authenticated user - cannot update preferences');
      return false;
    }

    try {
      const prefsRef = doc(db!, 'user_preferences', currentUser.uid);
      const updateData = {
        ...preferences,
        updatedAt: serverTimestamp()
      };

      await setDoc(prefsRef, updateData, { merge: true });
      console.log('✅ User preferences updated in Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error updating user preferences:', error);
      return false;
    }
  }

  // Add auth state listener
  public addAuthStateListener(listener: (user: User | null) => void): void {
    this.authStateListeners.push(listener);
  }

  // Remove auth state listener
  public removeAuthStateListener(listener: (user: User | null) => void): void {
    const index = this.authStateListeners.indexOf(listener);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  // Notify all auth state listeners
  private notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // Auto sign-in (return current user if authenticated)
  public async autoSignIn(): Promise<User | null> {
    if (!this.isFirebaseAvailable()) {
      return null;
    }

    // If already authenticated, return current user
    if (this.currentUser) {
      return this.currentUser;
    }

    // No auto sign-in for anonymous users anymore
    return null;
  }

  // Enhanced auth state change listener for store integration
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!this.isFirebaseAvailable()) {
      // Return a no-op unsubscribe function
      return () => {};
    }

    this.addAuthStateListener(callback);

    // Return unsubscribe function
    return () => {
      this.removeAuthStateListener(callback);
    };
  }

  // Get current authentication state
  public getAuthState(): { user: User | null; isAuthenticated: boolean } {
    return {
      user: this.currentUser,
      isAuthenticated: !!this.currentUser,
    };
  }

  // Check if user session is valid
  public isSessionValid(): boolean {
    return !!this.currentUser;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
