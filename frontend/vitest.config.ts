import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    testTimeout: 10000,
    // Enhanced configuration for authentication testing
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/test/**',
        '!src/__tests__/**'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.{js,ts}',
        '**/*.setup.{js,ts}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Higher thresholds for authentication code
        'src/contexts/AuthContext.tsx': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/services/api.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/hooks/useAuth.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    // Retry flaky tests
    retry: 2,
    // Parallel execution for faster test runs
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
});