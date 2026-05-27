import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['lib/__tests__/**/*.test.ts', 'lib/__tests__/**/*.test.tsx', 'hooks/__tests__/**/*.test.ts', 'hooks/__tests__/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'lib/**/*.tsx', 'hooks/**/*.ts', 'hooks/**/*.tsx'],
      exclude: ['lib/__tests__/**', 'hooks/__tests__/**', 'lib/test-utils.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
