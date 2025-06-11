# Social Media Sharing Feature

## Overview

The PHat5 app now includes comprehensive social media sharing functionality that allows users to share their Power Hour playlists across multiple social media platforms. This feature integrates seamlessly with the existing playlist sharing system.

## Supported Platforms

### 1. Facebook
- **Functionality**: Opens Facebook's share dialog with playlist details
- **Content**: Includes playlist name, description, share code, and app link
- **Implementation**: Uses Facebook's sharer API

### 2. Twitter/X
- **Functionality**: Opens Twitter's compose dialog with pre-filled content
- **Content**: Includes playlist info, hashtags, and share code
- **Character Limit**: Optimized to fit within Twitter's character limits
- **Hashtags**: Automatically includes relevant hashtags like #PowerHour, #Music, #Party

### 3. Instagram
- **Functionality**: Copies formatted text to clipboard (Instagram doesn't support direct URL sharing)
- **Content**: Includes emojis, hashtags, and formatted text suitable for Instagram posts
- **Usage**: Users paste the copied text into their Instagram post

### 4. WhatsApp
- **Functionality**: Opens WhatsApp with pre-filled message
- **Content**: Formatted message with playlist details and share code
- **Platform Support**: Works on both mobile and desktop WhatsApp

### 5. Generic Link Sharing
- **Functionality**: Copies a comprehensive share text to clipboard
- **Content**: Complete playlist information with share code and app link
- **Usage**: Can be pasted anywhere - email, Discord, Slack, etc.

## How to Use

### From Playlist Sharing Dialog
1. Create or edit a YouTube playlist
2. Click the share button to open the playlist sharing dialog
3. Complete the sharing setup (username, description, tags)
4. Click "Share Playlist" to generate the share code
5. In the success screen, use the social media buttons for quick sharing
6. Or click "More Sharing Options" for the full social media dialog

### From Community Playlists
1. Browse the Community page
2. Click "View Details" on any playlist card
3. Click the "Share" button in the details dialog
4. Choose your preferred social media platform

## Technical Implementation

### Files Added/Modified

#### New Files:
- `src/utils/socialMediaSharing.ts` - Core social media sharing utilities
- `src/components/SocialMediaShareDialog.tsx` - Social media sharing dialog component
- `src/hooks/useSocialMediaShare.ts` - Custom hook for social media sharing logic

#### Modified Files:
- `src/components/PlaylistSharingDialog.tsx` - Added social media buttons to success state
- `src/components/SharedPlaylistCard.tsx` - Added share button to playlist details dialog

### Key Features

#### Smart Content Generation
- Automatically generates platform-optimized content
- Includes relevant emojis and hashtags
- Respects character limits for each platform
- Formats content appropriately for each platform's style

#### Error Handling
- Graceful fallbacks for clipboard operations
- User feedback through snackbar notifications
- Handles popup blockers and browser restrictions

#### Responsive Design
- Works on both desktop and mobile devices
- Adapts to different screen sizes
- Touch-friendly interface

#### Environment Configuration
- Configurable app URL via `VITE_APP_URL` environment variable
- Defaults to `https://phat5-app.com` if not configured
- Easy to update for different deployment environments

## Configuration

### Environment Variables
Add to your `.env` file:
```
VITE_APP_URL=https://your-actual-app-domain.com
```

### Customization
The sharing content can be customized by modifying the `generateShareContent` function in `src/utils/socialMediaSharing.ts`.

## Content Format Examples

### Facebook/Twitter
```
🎵 Check out "My Awesome Playlist" - Power Hour Playlist

An amazing collection of party hits with 60 clips created by DJ_User

🎯 Share Code: ABC123XY
👤 Created by: DJ_User

https://phat5-app.com/community?code=ABC123XY

#PowerHour #Music #Party #Playlist
```

### Instagram
```
🎵 "My Awesome Playlist" - Power Hour Playlist

An amazing collection of party hits

🎯 Share Code: ABC123XY
👤 Created by: DJ_User
🎶 60 clips
⭐ Rating: 4.5/5

Import this playlist in PHat5 using the share code!

Link in bio or search for PHat5 Power Hour app

#PowerHour #Music #Party #Playlist #PartyMusic #PowerHourPlaylist
```

### WhatsApp
```
🎵 *My Awesome Playlist* - Power Hour Playlist

An amazing collection of party hits

🎯 *Share Code:* ABC123XY
👤 *Created by:* DJ_User
🎶 *60 clips*

Import this playlist in PHat5 using the share code!

https://phat5-app.com/community?code=ABC123XY
```

## Browser Compatibility

- **Modern Browsers**: Full functionality with native clipboard API
- **Older Browsers**: Fallback clipboard implementation
- **Mobile Browsers**: Optimized for mobile sharing workflows
- **Popup Blockers**: Graceful handling with user feedback

## Security Considerations

- No sensitive data is shared
- Share codes are public by design
- URLs use HTTPS for secure sharing
- No tracking or analytics in shared links

## Future Enhancements

### Planned Features
- **QR Code Generation**: Generate QR codes for easy mobile sharing
- **Custom Share Messages**: Allow users to customize share text
- **Share Analytics**: Track how playlists are being shared
- **More Platforms**: Add support for Discord, Reddit, LinkedIn
- **Share Templates**: Pre-defined templates for different occasions

### Potential Integrations
- **Deep Linking**: Direct links to specific playlists in the app
- **Rich Previews**: Open Graph meta tags for better link previews
- **Share Buttons**: Quick share buttons on playlist cards
- **Bulk Sharing**: Share multiple playlists at once

## Troubleshooting

### Common Issues

#### Popup Blocked
- **Issue**: Social media share dialogs don't open
- **Solution**: Allow popups for the PHat5 app domain
- **Alternative**: Use the copy-to-clipboard options

#### Clipboard Not Working
- **Issue**: Copy to clipboard fails
- **Solution**: Ensure HTTPS connection or use manual copy
- **Fallback**: Text is automatically selected for manual copying

#### Share Links Not Working
- **Issue**: Shared links don't work
- **Solution**: Verify `VITE_APP_URL` is correctly configured
- **Check**: Ensure the app is deployed and accessible

## Contributing

When adding new social media platforms:

1. Add the platform to the `SocialMediaShareOptions` type
2. Implement the URL generation function in `socialMediaSharing.ts`
3. Add the platform configuration to `SocialMediaShareDialog.tsx`
4. Update the `sharePlaylistOnPlatform` function
5. Add appropriate icons and styling

---

*This feature enhances the PHat5 Power Hour experience by making it easy to share amazing playlists with friends and the broader community across all major social media platforms!*
