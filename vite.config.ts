import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API + SSE to the backend during development.
      '/api': {
        target: process.env.ORCHESTRA_API || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
