# PowerHour App

A beautifully designed, fully featured Power Hour creator with YouTube integration (powered by yt-dlp).

## Features

- Modern, responsive design
- Create Power Hour playlists with 60 one-minute clips from YouTube or local files
- Seamless YouTube video importing (using yt-dlp)
- Playlist management and editing
- In-app playback with progress indicators
- Dark/light theme support
- Error handling and robust UX

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```
2. Run the app:
   ```
   npm run dev
   ```
3. To use YouTube downloading, ensure `yt-dlp` is installed and available in your PATH.

## Folder Structure

- `src/powerhour/` — Main app source code
- `src/powerhour/components/` — React components
- `src/powerhour/backend/` — Node backend for yt-dlp integration

## License

MIT