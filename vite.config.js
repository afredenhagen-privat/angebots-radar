// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/angebots-radar/', // GitHub Pages Repo-Pfad
  plugins: [vue()],
})
