# 🎵 PHat5 - The Ultimate Power Hour App

<div align="center">

**Create the perfect Power Hour experience with custom playlists, stunning visualizers, and seamless audio mixing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)

[Download Latest Release](https://github.com/your-username/phat5/releases) • [User Guide](USER_GUIDE.md) • [Report Bug](https://github.com/your-username/phat5/issues)

</div>

## 🎯 What is PHat5?

PHat5 is a modern, feature-rich desktop application designed to create the ultimate Power Hour experience. Whether you're hosting a party or just want to enjoy music in a unique way, PHat5 provides all the tools you need to create custom playlists with perfectly timed clips, stunning visualizations, and seamless playback.

## Features

### 🎵 Music Mixing
- Create custom Power Hour mixes from your music library
- Extract clips from songs with precise timing
- Combine clips with drinking sounds
- Save and manage multiple playlists

### 🎨 Music Visualizer
- **Multiple Visualizer Types**: Choose from frequency bars, circular, waveform, and particle visualizers
- **Real-time Audio Analysis**: Uses Web Audio API for live frequency and waveform data
- **Customizable Themes**: Integrates with the app's theme system or use custom colors
- **Full-screen Mode**: Immersive full-screen visualizer experience
- **Song Information Display**: Optional overlay showing current track info
- **Adjustable Settings**: Sensitivity, bar count, particle count, and more

### 🎨 Theming
- Multiple built-in color themes
- Custom theme creation with color picker
- Dark/light mode support
- Persistent theme preferences

## Music Visualizer

The music visualizer provides a real-time visual representation of your music with multiple customizable options:

### Visualizer Types
1. **Frequency Bars** - Classic frequency spectrum bars
2. **Circular** - Radial frequency display around a center point
3. **Waveform** - Real-time audio waveform visualization
4. **Particles** - Dynamic particle system that reacts to music

### Customization Options
- **Sensitivity**: Adjust how responsive the visualizer is to audio
- **Color Modes**: Theme colors, rainbow spectrum, or custom colors
- **Bar Count**: Number of frequency bars (16-256)
- **Particle Count**: Number of particles for particle visualizer (50-500)
- **Background Opacity**: Trail effect intensity
- **Song Info Display**: Toggle current track information

### Usage
1. Navigate to the Visualizer page using the navigation bar
2. Start playing music from Create Mix or Playlists
3. Customize the visualizer using the settings panel
4. Use full-screen mode for an immersive experience

## Technical Details

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
