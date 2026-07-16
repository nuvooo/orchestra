import { defineConfig } from 'vitest/config'

// Own config so vitest does not walk up and pick up the frontend's vite.config
// (React plugin, JSX transform) — the server has no use for any of it.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
