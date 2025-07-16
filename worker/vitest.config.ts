import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // Additional Miniflare options
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          // Use isolated storage for tests
          kvPersist: false,
          r2Persist: false,
          durableObjectsPersist: false
        }
      }
    }
  }
})