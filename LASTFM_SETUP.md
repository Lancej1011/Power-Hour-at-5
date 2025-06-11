# 🎵 Last.fm API Setup for Power Hour Generation

## Why Last.fm API?

The Last.fm API enables the Power Hour generator to find similar artists automatically, creating diverse playlists with great musical variety. Without it, the generator can only use the specific artist you enter.

## Quick Setup (5 minutes)

### 1. Get Your Free API Key

1. Go to **https://www.last.fm/api/account/create**
2. Create a free Last.fm account if you don't have one
3. Fill out the application form:
   - **Application Name**: `PHat5 Power Hour Generator`
   - **Application Description**: `Personal music playlist generator`
   - **Application Homepage URL**: `http://localhost` (or leave blank)
   - **Callback URL**: Leave blank
4. Click "Submit"
5. Copy the **API Key** (not the shared secret)

### 2. Add to Your Environment

1. In your PHat5 project folder, find or create a `.env` file
2. Add this line (replace with your actual API key):
   ```
   VITE_LASTFM_API_KEY=your_api_key_here
   ```
3. Save the file

### 3. Restart the Application

1. Stop the PHat5 app if it's running (Ctrl+C in terminal)
2. Start it again with `npm start`
3. You should see "🎵 Last.fm API configured and ready" in the console

## What This Enables

### ✅ With Last.fm API:
- **Smart Artist Discovery**: Finds 15-25 similar artists automatically
- **Genre Matching**: Considers musical style and genre compatibility  
- **Variety Mode**: Creates diverse playlists with 2 clips max per artist
- **Quality Recommendations**: Uses Last.fm's extensive music database

### ❌ Without Last.fm API:
- **Single Artist Only**: Can only use the exact artist you specify
- **No Variety**: All clips from the same artist or generic fallback searches
- **Limited Discovery**: Falls back to "top hits" and "party music" searches

## Troubleshooting

### "Last.fm API key not configured" Warning
- Check that your `.env` file is in the project root directory
- Verify the API key is correct (no extra spaces or quotes)
- Restart the application after adding the key

### "Failed to find similar artists" Error
- Check your internet connection
- Verify the artist name is spelled correctly
- Try a more popular/well-known artist name

### Rate Limiting Issues
- The app automatically handles Last.fm's rate limits
- If you see delays, this is normal and expected
- Free tier allows plenty of requests for personal use

## API Usage Details

- **Rate Limit**: 200ms between requests (built-in)
- **Cache Duration**: 24 hours (reduces API calls)
- **Max Similar Artists**: 50 per search (configurable)
- **Cost**: Completely free for personal use

## Privacy & Security

- Your API key is stored locally only
- No data is sent to external servers except Last.fm
- Last.fm API calls are read-only (no account access)
- API key is only used for music similarity lookups

## Alternative: Manual Artist Lists

If you prefer not to use the Last.fm API, you can still create great Power Hour playlists by:

1. Using **Single-Artist Mode** for artist-focused playlists
2. Using **Keyword Mode** with multiple genre terms
3. Using **Mixed Search** with "artist + genre" combinations

Example keyword searches:
- `rock, alternative rock, indie rock, classic rock`
- `pop, dance pop, electropop, synth pop`
- `hip hop, rap, trap, old school hip hop`
