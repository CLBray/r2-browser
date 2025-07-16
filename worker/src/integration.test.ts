import { describe, it, expect } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import type { AuthCredentials } from './types'

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

describe('R2 File Explorer Integration Tests', () => {
  describe('Health and API endpoints', () => {
    it('should return healthy status from health endpoint', async () => {
      const response = await SELF.fetch('http://localhost/health')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('environment')
      expect(data).toHaveProperty('version')
    })

    it('should return API information from root API endpoint', async () => {
      const response = await SELF.fetch('http://localhost/api')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('R2 File Explorer API')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('environment')
      expect(data).toHaveProperty('endpoints')
      expect(data.endpoints).toHaveProperty('health')
      expect(data.endpoints).toHaveProperty('auth')
      expect(data.endpoints).toHaveProperty('files')
    })
  })

  describe('Complete authentication flow', () => {
    it('should complete full auth flow: login -> verify -> refresh -> logout', async () => {
      // Step 1: Login
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json()
      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.data).toHaveProperty('token')
      
      const originalToken = loginData.data.token

      // Step 2: Verify token
      const verifyResponse = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      const verifyData = await verifyResponse.json()
      expect(verifyResponse.status).toBe(200)
      expect(verifyData.success).toBe(true)
      expect(verifyData.data.valid).toBe(true)

      // Step 3: Refresh token
      const refreshResponse = await SELF.fetch('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      const refreshData = await refreshResponse.json()
      expect(refreshResponse.status).toBe(200)
      expect(refreshData.success).toBe(true)
      expect(refreshData.data).toHaveProperty('token')
      
      const newToken = refreshData.data.token
      expect(newToken).not.toBe(originalToken)

      // Step 4: Verify old token is invalid
      const oldTokenVerifyResponse = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${originalToken}` }
      })

      expect(oldTokenVerifyResponse.status).toBe(401)

      // Step 5: Verify new token is valid
      const newTokenVerifyResponse = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      })

      const newTokenVerifyData = await newTokenVerifyResponse.json()
      expect(newTokenVerifyResponse.status).toBe(200)
      expect(newTokenVerifyData.success).toBe(true)

      // Step 6: Logout
      const logoutResponse = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${newToken}` }
      })

      const logoutData = await logoutResponse.json()
      expect(logoutResponse.status).toBe(200)
      expect(logoutData.success).toBe(true)

      // Step 7: Verify token is invalid after logout
      const postLogoutVerifyResponse = await SELF.fetch('http://localhost/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      })

      expect(postLogoutVerifyResponse.status).toBe(401)
    })
  })

  describe('File operations with authentication', () => {
    let authToken: string

    // Helper to get auth token
    const getAuthToken = async (): Promise<string> => {
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const loginData = await loginResponse.json()
      return loginData.data.token
    }

    it('should list files with authentication', async () => {
      authToken = await getAuthToken()

      const response = await SELF.fetch('http://localhost/api/files', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      expect(response.status).not.toBe(401) // Should not be unauthorized
      
      const data = await response.json()
      if (response.status === 200) {
        expect(data.success).toBe(true)
        expect(data).toHaveProperty('objects')
        expect(Array.isArray(data.objects)).toBe(true)
      }
    })

    it('should handle file upload with authentication', async () => {
      authToken = await getAuthToken()

      const testFile = new Blob(['test file content'], { type: 'text/plain' })
      
      const response = await SELF.fetch('http://localhost/api/files/upload?filename=test-upload.txt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: testFile
      })

      expect(response.status).not.toBe(401) // Should not be unauthorized
      
      const data = await response.json()
      if (response.status === 200) {
        expect(data.success).toBe(true)
        expect(data.filename).toBe('test-upload.txt')
        expect(data).toHaveProperty('size')
      }
    })

    it('should handle file download with authentication', async () => {
      authToken = await getAuthToken()

      const response = await SELF.fetch('http://localhost/api/files/nonexistent-file.txt', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      expect(response.status).not.toBe(401) // Should not be unauthorized
      
      // File likely doesn't exist, so expect 404, but auth should work
      if (response.status === 404) {
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('File not found')
      }
    })

    it('should handle file deletion with authentication', async () => {
      authToken = await getAuthToken()

      const response = await SELF.fetch('http://localhost/api/files/test-file-to-delete.txt', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      expect(response.status).not.toBe(401) // Should not be unauthorized
      
      const data = await response.json()
      if (response.status === 200) {
        expect(data.success).toBe(true)
        expect(data.filename).toBe('test-file-to-delete.txt')
      }
    })

    it('should reject file operations without authentication', async () => {
      // Try to list files without auth
      const listResponse = await SELF.fetch('http://localhost/api/files')
      expect(listResponse.status).toBe(401)

      // Try to upload without auth
      const uploadResponse = await SELF.fetch('http://localhost/api/files/upload', {
        method: 'POST',
        body: new Blob(['test'])
      })
      expect(uploadResponse.status).toBe(401)

      // Try to download without auth
      const downloadResponse = await SELF.fetch('http://localhost/api/files/test.txt')
      expect(downloadResponse.status).toBe(401)

      // Try to delete without auth
      const deleteResponse = await SELF.fetch('http://localhost/api/files/test.txt', {
        method: 'DELETE'
      })
      expect(deleteResponse.status).toBe(401)
    })
  })

  describe('File size limits', () => {
    it('should reject files that exceed size limit', async () => {
      const authToken = await (async (): Promise<string> => {
        const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validCredentials)
        })

        const loginData = await loginResponse.json()
        return loginData.data.token
      })()

      // Create a file larger than the configured limit
      // Assuming MAX_FILE_SIZE_MB is set to 50MB in test environment
      const maxSizeMB = parseInt(env.MAX_FILE_SIZE_MB)
      const oversizedContent = 'x'.repeat((maxSizeMB + 1) * 1024 * 1024) // 1MB over limit
      const oversizedFile = new Blob([oversizedContent], { type: 'text/plain' })
      
      const response = await SELF.fetch('http://localhost/api/files/upload?filename=oversized.txt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: oversizedFile
      })

      expect(response.status).toBe(413)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('File size exceeds maximum')
    })
  })

  describe('Error handling', () => {
    it('should return 404 for non-existent API endpoints', async () => {
      const response = await SELF.fetch('http://localhost/api/nonexistent')
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not Found')
    })

    it('should handle malformed JSON in requests', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content'
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })

  describe('Static asset serving', () => {
    it('should serve index.html for SPA routes', async () => {
      const response = await SELF.fetch('http://localhost/dashboard')
      
      // Should either serve index.html (200) or return 404 if assets not configured
      expect([200, 404]).toContain(response.status)
      
      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('text/html')
      }
    })

    it('should return 404 for non-existent static assets', async () => {
      const response = await SELF.fetch('http://localhost/nonexistent-asset.js')
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not Found')
    })
  })
})