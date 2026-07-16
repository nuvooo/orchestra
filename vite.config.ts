import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // The server has its own vitest config and its own `npm test`; without this
  // the root run would also collect server/src and report a misleading count.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
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
