/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// האתר מתפרסם ב-GitHub Pages תחת /apex/
export default defineConfig({
  base: '/apex/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'APEX',
        short_name: 'APEX',
        description: 'אפליקציית אימונים עם מאמן חכם, רצף שבועי ומעקב התקדמות',
        lang: 'he',
        dir: 'rtl',
        start_url: '/apex/',
        scope: '/apex/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
        navigateFallback: '/apex/index.html',
        runtimeCaching: [
          {
            // תמונות התרגילים: נשמרות במטמון בפעם הראשונה שמציגים אותן
            urlPattern: ({ url }) => url.pathname.startsWith('/apex/ex/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 500 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
