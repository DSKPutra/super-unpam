import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png', 'brand/unpam-logo-256.webp'],
      manifest: {
        id: '/',
        name: 'Super UNPAM',
        short_name: 'Super UNPAM',
        description:
          'Super App Universitas Pamulang — semua layanan kampus dalam satu aplikasi: KTM digital, presensi online, jadwal, KRS, nilai, kuliah online, pembayaran UKT, event, sertifikasi, TOEFL.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        theme_color: '#0A0E1A',
        background_color: '#070B14',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'KTM Digital', short_name: 'KTM', url: '/#/ktm', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Presensi', short_name: 'Presensi', url: '/#/presensi', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Jadwal Kuliah', short_name: 'Jadwal', url: '/#/akademik/jadwal', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Pembayaran', short_name: 'Bayar', url: '/#/keuangan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,webmanifest}'],
        // ikon 1024 hanya untuk toko aplikasi — tidak perlu di-cache offline
        globIgnores: ['**/maskable-1024.png'],
        runtimeCaching: [
          {
            // Data baca BFF (lihat api/). Sesi, QR dinamis, dan presensi tidak boleh dilayani dari cache.
            // Cache ini dihapus saat keluar akun (logout di src/lib/api.ts).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !/^\/api\/(auth|qr|presensi)\//.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: ({ request }) => ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: { cacheName: 'assets', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
        },
      },
    },
  },
})
