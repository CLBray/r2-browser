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

describe('Auth Handlers Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toContain('Missing required credentials')
    })

    it('should return 400 for missing accountId', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: '12345678901234567890',
          secretAccessKey: '1234567890123456789012345678901234567890',
          bucketName: 'test-bucket'
        })
      })

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 401 for invalid credentials', async () => {
      const invalidCredentials = {
        accountId: 'invalid-account-id',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      }

      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCredentials)
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid credentials provided')
    })

    it('should return 200 and token for valid credentials', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('token')
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data.bucketName).toBe(validCredentials.bucketName)
      expect(data.message).toBe('Authentication successful')
      expect(typeof data.data.token).toBe('string')
      expect(typeof data.data.expiresAt).toBe('number')
    })

    it('should handle invalid JSON gracefully', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      })

      const data = await response.json() as any

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should return 400 for missing authorization header', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST'
      })

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 400 for invalid authorization header format', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'InvalidFormat token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 200 for logout with valid token', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Then logout
      const response = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Logout successful')
    })

    it('should return 200 even for invalid token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/auth/verify', () => {
    it('should return 400 for missing authorization header', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/verify')

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 401 for invalid token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid or expired token')
    })

    it('should return 200 for valid token', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const token = loginData.data.token

      // Then verify
      const response = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.valid).toBe(true)
      expect(data.data.bucketName).toBe(validCredentials.bucketName)
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data).toHaveProperty('userId')
      expect(data.message).toBe('Token is valid')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should return 400 for missing authorization header', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/refresh', {
        method: 'POST'
      })

      const data = await response.json() as any

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 401 for invalid token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const data = await response.json() as any

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Unable to refresh token')
    })

    it('should return 200 with new token for valid refresh', async () => {
      // First login to get a valid token
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json() as any
      const originalToken = loginData.data.token

      // Then refresh
      const response = await SELF.fetch('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('token')
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data.token).not.toBe(originalToken) // Should be a new token
      expect(data.message).toBe('Token refreshed successfully')
    })
  })
})