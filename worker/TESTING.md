# Testing Strategy for R2 File Explorer Worker

This document outlines the testing strategy for the Cloudflare Worker API, following Cloudflare's recommended testing practices using the Workers Vitest integration.

## Overview

We use Cloudflare's Workers Vitest integration (`@cloudflare/vitest-pool-workers`) which allows tests to run inside the Workers runtime, providing:

- **Unit tests** for individual services and functions
- **Integration tests** for complete API workflows
- **Direct access** to Workers runtime APIs and bindings
- **Isolated per-test storage** for KV and R2
- **Real Workers environment** using Miniflare

## Test Structure

### Unit Tests
Located alongside source files with `.test.ts` suffix:
- `src/services/auth.test.ts` - AuthService unit tests
- Tests individual functions and methods in isolation
- Uses real KV bindings but with isolated storage

### Integration Tests
- `src/handlers/auth.test.ts` - Auth handler integration tests
- `src/middleware/auth.test.ts` - Auth middleware integration tests
- `src/integration.test.ts` - Full application integration tests
- Tests complete request/response cycles using `SELF` fetcher

## Key Testing Patterns

### Using `cloudflare:test` Module

```typescript
import { env, SELF } from 'cloudflare:test'

// Declare environment types
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    KV_SESSIONS: KVNamespace
    JWT_SECRET: string
    // ... other bindings
  }
}

// Unit test with direct binding access
it('should store data in KV', async () => {
  await env.KV_SESSIONS.put('key', 'value')
  const result = await env.KV_SESSIONS.get('key')
  expect(result).toBe('value')
})

// Integration test with SELF fetcher
it('should handle login request', async () => {
  const response = await SELF.fetch('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })
  
  expect(response.status).toBe(200)
})
```

### Test Environment Configuration

Tests use the development environment configuration from `wrangler.toml`:
- JWT_SECRET: "dev-secret-key-for-local-development-only-not-secure"
- JWT_EXPIRY_HOURS: "24"
- MAX_FILE_SIZE_MB: "50"
- ENVIRONMENT: "development"

### Isolated Storage

Each test runs with isolated storage:
- KV operations don't persist between tests
- R2 operations don't persist between tests
- No cleanup required between tests

## Test Categories

### 1. AuthService Unit Tests (`src/services/auth.test.ts`)

Tests the authentication service in isolation:
- Credential validation (format checking)
- Session creation and JWT generation
- Token validation and session retrieval
- Session revocation and cleanup
- Token refresh functionality
- Error handling and edge cases

**Key Features:**
- Uses real KV bindings with isolated storage
- Tests actual JWT creation and validation
- Verifies session data structure and expiration

### 2. Auth Handler Integration Tests (`src/handlers/auth.test.ts`)

Tests authentication endpoints end-to-end:
- POST `/api/auth/login` - Login with credentials
- POST `/api/auth/logout` - Session termination
- GET `/api/auth/verify` - Token validation
- POST `/api/auth/refresh` - Token refresh

**Key Features:**
- Uses `SELF` fetcher for real HTTP requests
- Tests complete request/response cycles
- Verifies HTTP status codes and response formats
- Tests error scenarios (invalid input, malformed JSON)

### 3. Auth Middleware Integration Tests (`src/middleware/auth.test.ts`)

Tests authentication middleware behavior:
- Protected route access control
- Token extraction from Authorization header
- Session validation and context setting
- Error handling for invalid/expired tokens

**Key Features:**
- Tests middleware integration with protected routes
- Verifies token-based access control
- Tests various authentication failure scenarios

### 4. Full Application Integration Tests (`src/integration.test.ts`)

Tests complete application workflows:
- Health check and API info endpoints
- Complete authentication flow (login → verify → refresh → logout)
- File operations with authentication
- File size limit enforcement
- Error handling and edge cases
- Static asset serving

**Key Features:**
- End-to-end workflow testing
- Cross-feature integration testing
- Real-world usage scenarios

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage
```bash
npm run test:coverage
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          kvPersist: false,
          r2Persist: false,
          durableObjectsPersist: false
        }
      }
    }
  }
})
```

### Environment Types
Each test file declares the expected environment interface:
```typescript
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    KV_SESSIONS: KVNamespace
    JWT_SECRET: string
    JWT_EXPIRY_HOURS: string
    MAX_FILE_SIZE_MB: string
    ENVIRONMENT: string
  }
}
```

## Best Practices

### 1. Use Real Bindings
- Prefer real KV/R2 operations over mocks
- Leverage isolated storage for test independence
- Test actual Workers runtime behavior

### 2. Test Both Unit and Integration
- Unit tests for business logic and edge cases
- Integration tests for request/response flows
- Full workflow tests for user scenarios

### 3. Comprehensive Error Testing
- Test invalid inputs and malformed data
- Verify error response formats
- Test authentication failure scenarios

### 4. Realistic Test Data
- Use properly formatted credentials
- Test with various data sizes and formats
- Include edge cases and boundary conditions

### 5. Async/Await Patterns
- Always await async operations
- Handle promise rejections appropriately
- Test timeout and error scenarios

## Migration from Mock-Based Testing

The previous testing approach used mocks and manual setup. The new approach:

**Before (Mock-based):**
```typescript
const mockKV = { get: vi.fn(), put: vi.fn() }
const mockBindings = { KV_SESSIONS: mockKV }
```

**After (Workers Vitest):**
```typescript
import { env } from 'cloudflare:test'
// Use real KV with isolated storage
await env.KV_SESSIONS.put('key', 'value')
```

**Benefits:**
- Tests run in actual Workers runtime
- Real binding behavior (not mocked)
- Automatic cleanup between tests
- More reliable and realistic testing

## Debugging Tests

### VS Code Configuration
Create `.vscode/launch.json`:
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["--inspect=9229", "--no-file-parallelism"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Command Line Debugging
```bash
npm run test:watch -- --inspect --no-file-parallelism
```

## Continuous Integration

Tests are designed to run in CI environments:
- No external dependencies required
- Isolated storage prevents test interference
- Deterministic behavior with proper async handling
- Fast execution with Workers runtime

## Coverage Goals

- **Unit Tests**: 90%+ coverage for business logic
- **Integration Tests**: All API endpoints covered
- **Error Scenarios**: All error paths tested
- **Edge Cases**: Boundary conditions and invalid inputs

This testing strategy ensures robust, reliable code that behaves correctly in the Workers runtime environment.