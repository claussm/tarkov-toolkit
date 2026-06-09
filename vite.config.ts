import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Tarkov Toolkit',
        short_name: 'Tarkov Toolkit',
        description:
          'Second-monitor companion for Escape from Tarkov: item lookup, ammo chart, and interactive maps.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell + self-hosted map SVGs so maps work offline.
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        // The largest map SVG (~335 KB) is well under the default 2 MB cap; raise headroom anyway.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Item icons and other static assets served from tarkov.dev's CDN (GET).
            urlPattern: ({ url }) => url.origin === 'https://assets.tarkov.dev',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tarkov-assets',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
