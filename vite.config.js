import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ['@ffmpeg/ffmpeg'],
    },
    base: './',
    build: {
        // Optimize for production
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console statements in production
                drop_debugger: true,
            },
        },
        // Code splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunk for large dependencies
                    vendor: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
                    // Audio processing chunk
                    audio: ['howler', 'music-metadata', 'audiobuffer-to-wav'],
                    // UI components chunk
                    ui: ['@hello-pangea/dnd', 'react-window', 'react-dropzone'],
                },
            },
        },
        // Increase chunk size warning limit for audio libraries
        chunkSizeWarningLimit: 1000,
        // Source maps for debugging in production (optional)
        sourcemap: false,
    },
    // Performance optimizations
    server: {
        port: 5173,
        fs: {
            // Allow serving files from one level up to the project root
            allow: ['..'],
        },
    },
    // Web deployment specific configurations
    define: {
        // Define environment variables for web deployment
        __IS_WEB__: JSON.stringify(true),
        __IS_ELECTRON__: JSON.stringify(false),
    },
    // PWA configuration
    publicDir: 'public',
});
