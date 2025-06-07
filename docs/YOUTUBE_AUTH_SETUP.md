# YouTube Authentication Setup Guide

PHat5 now supports two methods for YouTube API authentication to help overcome quota limitations:

## 🚀 Quick Start

1. **Google OAuth 2.0 (Recommended)** - Higher quota limits, easier setup
2. **API Keys** - Manual setup, multiple keys for increased quota

## 📋 Prerequisites

- Google Cloud Console account
- YouTube Data API v3 enabled

## 🔐 Method 1: Google OAuth 2.0 (Recommended)

### Benefits
- Higher per-user quota limits
- Automatic token refresh
- No manual API key management
- Better user experience

### Setup Steps

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Create a new project or select existing one

3. **Enable YouTube Data API v3**
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields:
     - App name: "PHat5"
     - User support email: your email
     - Developer contact: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "PHat5 YouTube Integration"
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (for development)
     - `https://yourdomain.com/auth/callback` (for production)

6. **Configure Environment**
   - Copy the Client ID
   - Create `.env` file in project root:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

## 🔑 Method 2: API Keys

### Benefits
- Works without user sign-in
- Multiple keys for quota rotation
- Full control over usage

### Setup Steps

1. **Create API Key**
   - Go to Google Cloud Console
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key

2. **Restrict API Key (Recommended)**
   - Click on the created API key
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Under "Application restrictions", choose appropriate option

3. **Add to PHat5**
   - Open PHat5 YouTube page
   - Click "Set Up Authentication"
   - Go to "API Keys" tab
   - Add your API key with a descriptive name

## 🔄 Hybrid Approach

You can use both methods simultaneously:
- OAuth for primary usage (higher limits)
- API keys as fallback when OAuth quota is exceeded
- Automatic switching between methods

## 📊 Quota Management

### Default Limits
- **API Keys**: 10,000 units/day per project
- **OAuth**: Higher per-user limits (varies)

### Usage Tracking
- Real-time quota monitoring
- Automatic key rotation when limits reached
- Warning notifications at 80% usage

### Optimization Tips
1. **Use OAuth when possible** - Higher limits
2. **Add multiple API keys** - Increased total quota
3. **Enable caching** - Reduces API calls
4. **Monitor usage** - Track quota consumption

## 🛠️ Troubleshooting

### Common Issues

**"API key is invalid"**
- Verify the key is correct
- Check API restrictions
- Ensure YouTube Data API v3 is enabled

**"Quota exceeded"**
- Add more API keys
- Use OAuth authentication
- Wait for quota reset (daily)

**"OAuth sign-in failed"**
- Check redirect URIs
- Verify OAuth consent screen setup
- Ensure client ID is correct

**"CORS errors"**
- Verify authorized origins in OAuth settings
- Check redirect URI configuration

### Debug Mode
Enable debug logging in browser console:
```javascript
localStorage.setItem('youtube_debug', 'true');
```

## 🔒 Security & Privacy

### Data Storage
- All credentials stored locally in browser
- No data sent to PHat5 servers
- OAuth tokens encrypted in localStorage

### Best Practices
- Keep API keys secure
- Don't share credentials
- Use environment variables for client IDs
- Regularly rotate API keys

## 📈 Performance Tips

### Caching
- 5-minute cache for search results
- Persistent cache for video metadata
- Smart cache invalidation

### Batch Requests
- Multiple video details in single request
- Optimized pagination
- Reduced API calls

### Error Handling
- Graceful fallback between auth methods
- Retry logic for temporary failures
- User-friendly error messages

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Google Cloud Console setup
3. Test with a simple API key first
4. Check network connectivity

For additional help, refer to:
- [Google Cloud Console Documentation](https://cloud.google.com/docs)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
