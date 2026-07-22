// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/angebots-radar/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registrierung erfolgt bewusst selbst in src/main.js, damit eine neue
      // Version sofort übernommen wird statt erst beim übernächsten Start.
      injectRegister: false,
      manifest: {
        name: 'Angebots-Radar',
        short_name: 'Angebote',
        lang: 'de',
        description: 'Supermarkt-Angebote in Höchberg und Würzburg mit Preisverlauf und Preiswecker.',
        start_url: '/angebots-radar/',
        scope: '/angebots-radar/',
        display: 'standalone',
        // Farben aus dem Design-System (siehe tailwind.config.js), damit
        // Splashscreen und Systemleisten zur App passen.
        background_color: '#EDEFF2',
        theme_color: '#1B3A6B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Das Motiv sitzt in der sicheren Mitte, taugt also auch als
          // maskierbares Icon (Android schneidet es in seine Systemform).
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
