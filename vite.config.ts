import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'DH - Quản lý phòng trọ',
        short_name: 'DH',
        description: 'Hệ thống quản lý phòng trọ thông minh',
        theme_color: '#4F46E5',
        background_color: '#F5F7FB',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'supabase':       ['@supabase/supabase-js'],
          'charts':         ['chart.js', 'react-chartjs-2'],
          'pdf':            ['jspdf', 'jspdf-autotable'],
          'ui':             ['lucide-react', 'clsx', 'tailwind-merge'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
