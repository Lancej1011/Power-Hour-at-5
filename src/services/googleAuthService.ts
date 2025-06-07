/**
 * Google OAuth 2.0 Service for YouTube API Authentication
 * Handles user authentication and token management
 */

import { 
  YouTubeOAuthTokens, 
  YouTubeUser, 
  YOUTUBE_OAUTH_CONFIG,
  YOUTUBE_STORAGE_KEYS,
  YouTubeAuthError
} from '../types/youtube-auth';

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isInitialized = false;
  private authWindow: Window | null = null;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Initialize the Google Auth service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we have valid stored tokens
      const storedTokens = this.getStoredTokens();
      if (storedTokens && this.isTokenValid(storedTokens)) {
        console.log('✅ Found valid stored OAuth tokens');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Auth service:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google using OAuth 2.0 popup flow
   */
  async signIn(): Promise<{ tokens: YouTubeOAuthTokens; user: YouTubeUser }> {
    if (!YOUTUBE_OAUTH_CONFIG.clientId || YOUTUBE_OAUTH_CONFIG.clientId === 'REPLACE_WITH_YOUR_ACTUAL_CLIENT_ID') {
      throw new Error('Google Client ID not configured.\n\nTo enable OAuth 2.0:\n1. Go to Google Cloud Console\n2. Create OAuth 2.0 credentials\n3. Set VITE_GOOGLE_CLIENT_ID in .env file\n4. Restart the development server\n\nFor now, you can use the API Key method in the "API Keys" tab.');
    }

    try {
      const authUrl = this.buildAuthUrl();
      console.log('🚀 Starting OAuth flow...');
      const accessToken = await this.openAuthPopup(authUrl);
      console.log('🎫 Access token received, getting user profile...');

      // Create tokens object from the access token
      const tokens: YouTubeOAuthTokens = {
        accessToken,
        expiresAt: Date.now() + (3600 * 1000), // 1 hour default
        tokenType: 'Bearer',
        scope: YOUTUBE_OAUTH_CONFIG.scopes.join(' '),
      };

      const user = await this.getUserProfile(accessToken);
      console.log('👤 User profile retrieved:', user.name);

      // Store tokens and user info
      this.storeTokens(tokens);
      this.storeUserProfile(user);

      console.log('✅ Google OAuth sign-in successful');
      return { tokens, user };
    } catch (error: any) {
      console.error('❌ Google OAuth sign-in failed:', error);
      throw this.createAuthError('invalid_credentials', 'Failed to sign in with Google', error);
    }
  }

  /**
   * Sign out and clear stored credentials
   */
  async signOut(): Promise<void> {
    try {
      const tokens = this.getStoredTokens();
      
      // Revoke tokens if available
      if (tokens?.accessToken) {
        await this.revokeTokens(tokens.accessToken);
      }

      // Clear stored data
      this.clearStoredData();
      
      console.log('✅ Google OAuth sign-out successful');
    } catch (error) {
      console.error('Google OAuth sign-out error:', error);
      // Still clear local data even if revocation fails
      this.clearStoredData();
    }
  }

  /**
   * Refresh access tokens using refresh token
   */
  async refreshTokens(): Promise<YouTubeOAuthTokens> {
    const storedTokens = this.getStoredTokens();
    
    if (!storedTokens?.refreshToken) {
      throw new Error('No refresh token available. Please sign in again.');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: YOUTUBE_OAUTH_CONFIG.clientId,
          refresh_token: storedTokens.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const newTokens: YouTubeOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || storedTokens.refreshToken, // Keep existing if not provided
        expiresAt: Date.now() + (data.expires_in * 1000),
        tokenType: 'Bearer',
        scope: data.scope || storedTokens.scope,
      };

      this.storeTokens(newTokens);
      console.log('✅ OAuth tokens refreshed successfully');
      
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw this.createAuthError('invalid_credentials', 'Failed to refresh tokens', error);
    }
  }

  /**
   * Get current valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.getStoredTokens();
    
    if (!tokens) return null;

    // Check if token is still valid (with 5-minute buffer)
    if (tokens.expiresAt > Date.now() + 300000) {
      return tokens.accessToken;
    }

    // Try to refresh
    try {
      const refreshedTokens = await this.refreshTokens();
      return refreshedTokens.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens ? this.isTokenValid(tokens) : false;
  }

  /**
   * Get stored user profile
   */
  getStoredUser(): YouTubeUser | null {
    try {
      const stored = localStorage.getItem(YOUTUBE_STORAGE_KEYS.USER_PROFILE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Private methods

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: YOUTUBE_OAUTH_CONFIG.clientId,
      redirect_uri: YOUTUBE_OAUTH_CONFIG.redirectUri,
      response_type: 'token', // Use implicit flow for client-side apps
      scope: YOUTUBE_OAUTH_CONFIG.scopes.join(' '),
      state: this.generateState(),
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    console.log('🔗 Built auth URL:', authUrl);
    return authUrl;
  }

  private async openAuthPopup(authUrl: string): Promise<string> {
    console.log('🔗 Opening OAuth popup with URL:', authUrl);

    return new Promise((resolve, reject) => {
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        const error = new Error('Failed to open authentication popup. Please allow popups for this site.');
        console.error('❌ Popup blocked:', error);
        reject(error);
        return;
      }

      console.log('✅ Popup opened successfully');
      this.authWindow = popup;

      // Poll for the popup to close or redirect
      const pollTimer = setInterval(() => {
        try {
          if (popup.closed) {
            console.log('🚪 Popup closed by user');
            clearInterval(pollTimer);
            reject(new Error('Authentication cancelled by user'));
            return;
          }

          // Check if we've been redirected to our callback URL
          const currentUrl = popup.location.href;
          console.log('🔍 Checking popup URL:', currentUrl);

          if (currentUrl.includes(YOUTUBE_OAUTH_CONFIG.redirectUri) && currentUrl.includes('#')) {
            console.log('🎯 Callback URL detected with hash');

            // Parse the hash fragment for tokens (implicit flow)
            const hashParams = new URLSearchParams(popup.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const error = hashParams.get('error');
            const errorDescription = hashParams.get('error_description');

            clearInterval(pollTimer);
            popup.close();

            if (error) {
              const errorMsg = `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`;
              console.error('❌ OAuth error:', errorMsg);
              reject(new Error(errorMsg));
            } else if (accessToken) {
              console.log('✅ Access token received');
              resolve(accessToken);
            } else {
              console.error('❌ No access token in callback');
              reject(new Error('No access token received'));
            }
          }
        } catch (e) {
          // Cross-origin error - popup is still on Google's domain
          // This is expected and normal - continue polling
          console.log('🔄 Popup still on Google domain (normal)');
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        console.log('⏰ OAuth timeout reached');
        clearInterval(pollTimer);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error('Authentication timeout - please try again'));
      }, 300000);
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<YouTubeOAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: YOUTUBE_OAUTH_CONFIG.clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: YOUTUBE_OAUTH_CONFIG.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: 'Bearer',
      scope: data.scope,
    };
  }

  private async getUserProfile(accessToken: string): Promise<YouTubeUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      picture: data.picture,
    };
  }

  private async revokeTokens(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST',
    });
  }

  private getStoredTokens(): YouTubeOAuthTokens | null {
    try {
      const stored = localStorage.getItem(YOUTUBE_STORAGE_KEYS.OAUTH_TOKENS);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeTokens(tokens: YouTubeOAuthTokens): void {
    localStorage.setItem(YOUTUBE_STORAGE_KEYS.OAUTH_TOKENS, JSON.stringify(tokens));
  }

  private storeUserProfile(user: YouTubeUser): void {
    localStorage.setItem(YOUTUBE_STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  }

  private clearStoredData(): void {
    localStorage.removeItem(YOUTUBE_STORAGE_KEYS.OAUTH_TOKENS);
    localStorage.removeItem(YOUTUBE_STORAGE_KEYS.USER_PROFILE);
  }

  private isTokenValid(tokens: YouTubeOAuthTokens): boolean {
    return tokens.expiresAt > Date.now();
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private createAuthError(type: YouTubeAuthError['type'], message: string, details?: any): YouTubeAuthError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
    };
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
