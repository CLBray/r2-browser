import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'
import type { AuthCredentials } from '../types'

// Declare the test environment types
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    R2_BUCKET: R2Bucket
    KV_SESSIONS: KVNamespace
    ANALYTICS?: AnalyticsEngineDataset
    ASSETS: Fetcher
    JWT_SECRET: string
    JWT_EXPIRY_HOURS: string
    MAX_FILE_SIZE_MB: string
    ENVIRONMENT: string
  }
}

// Valid test credentials
const validCredentials: AuthCredentials = {
  accountId: 'a1b2c3d4e5f678901234567890123456',
  accessKeyId: '12345678901234567890',
  secretAccessKey: '1234567890123456789012345678901234567890',
  bucketName: 'test-bucket'
}

describe('Auth Middleware Integration Tests', () => {
  describe('Protected routes (authMiddleware)', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await SELF.fetch('http://localhost/api/files')

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for invalid authorization header format', async () => {
      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': 'InvalidFormat token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for empty Bearer token', async () => {
      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': 'Bearer ' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for invalid token', async () => {
      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid or expired token')
    })

    it('should allow access with valid token', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Then access protected route
      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Should not return 401 (auth middleware should pass)
      expect(response.status).not.toBe(401)
      
      // The actual response depends on R2 bucket contents, but auth should work
      const data = await response.json() as any
      if (response.status === 200) {
        expect(data.success).toBe(true)
        expect(data).toHaveProperty('objects')
      }
    })

    it('should work with file upload endpoint', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Try to upload a file (should pass auth middleware)
      const testFile = new Blob(['test content'], { type: 'text/plain' })
      
      const response = await SELF.fetch('http://localhost/api/files/upload?filename=test.txt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: testFile
      })

      // Should not return 401 (auth middleware should pass)
      expect(response.status).not.toBe(401)
      
      // The actual response depends on R2 bucket setup, but auth should work
      const data = await response.json() as any
      if (response.status === 200) {
        expect(data.success).toBe(true)
      }
    })

    it('should work with file download endpoint', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Try to download a file (should pass auth middleware)
      const response = await SELF.fetch('http://localhost/api/files/nonexistent.txt', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Should not return 401 (auth middleware should pass)
      expect(response.status).not.toBe(401)
      
      // File doesn't exist, so should return 404, but auth should work
      if (response.status === 404) {
        const data = await response.json() as any
        expect(data.success).toBe(false)
        expect(data.error).toBe('File not found')
      }
    })

    it('should work with file delete endpoint', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Try to delete a file (should pass auth middleware)
      const response = await SELF.fetch('http://localhost/api/files/nonexistent.txt', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Should not return 401 (auth middleware should pass)
      expect(response.status).not.toBe(401)
      
      // The actual response depends on R2 bucket setup, but auth should work
      const data = await response.json() as any
      if (response.status === 200) {
        expect(data.success).toBe(true)
      }
    })
  })

  describe('Token refresh flow', () => {
    it('should work with refreshed tokens', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const originalToken = loginData.data.token

      // Refresh the token
      const refreshResponse = await SELF.fetch('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      const refreshData = await refreshResponse.json() as any
      const newToken = refreshData.data.token

      // Use the new token to access protected route
      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      })

      // Should not return 401 (auth middleware should pass with new token)
      expect(response.status).not.toBe(401)
      
      // Verify old token is no longer valid
      const oldTokenResponse = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      expect(oldTokenResponse.status).toBe(401)
    })
  })
})