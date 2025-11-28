import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist', // Standard output for Capacitor
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
})