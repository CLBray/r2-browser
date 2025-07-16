import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        main: './src/index.ts',
        miniflare: {
          // Additional Miniflare options
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          // Use isolated storage for tests
          kvPersist: false,
          r2Persist: false,
          durableObjectsPersist: false,
          // Bindings for tests
          kvNamespaces: ['KV_SESSIONS'],
          r2Buckets: ['R2_BUCKET'],
          bindings: {
            JWT_SECRET: 'test-secret-key-that-is-long-enough-for-jwt',
            JWT_EXPIRY_HOURS: '24',
            MAX_FILE_SIZE_MB: '50',
            ENVIRONMENT: 'test'
          }
        }
      }
    }
  }
})