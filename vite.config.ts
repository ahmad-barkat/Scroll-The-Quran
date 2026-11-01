import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'quran.json', 'verification-report.json'],
      manifest: {
        id: '/',
        name: 'Scroll the Quran',
        short_name: 'Scroll Quran',
        description:
          'A calm, full-screen Quran reader. One ayah at a time, with verified Uthmani text, translation, and recitation.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/#/read',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#070b14',
        theme_color: '#070b14',
        categories: ['books', 'education', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Search the Quran', short_name: 'Search', url: '/#/search', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Verse of the Day', short_name: 'Discover', url: '/#/discover', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'everyayah.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-recitations',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
