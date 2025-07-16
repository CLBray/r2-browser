import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { loginHandler, logoutHandler, verifyHandler, refreshHandler } from './auth'
import type { Bindings, AuthCredentials } from '../types'

// Mock AuthService
vi.mock('../services/auth', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    validateCredentials: vi.fn(),
    createSession: vi.fn(),
    validateToken: vi.fn(),
    revokeSession: vi.fn(),
    refreshToken: vi.fn()
  }))
}))

// Mock analytics
const mockAnalytics = {
  writeDataPoint: vi.fn()
}

// Mock bindings
const mockBindings: Bindings = {
  R2_BUCKET: {} as R2Bucket,
  KV_SESSIONS: {} as KVNamespace,
  ANALYTICS: mockAnalytics as any,
  ASSETS: {} as Fetcher,
  JWT_SECRET: 'test-secret-key',
  JWT_EXPIRY_HOURS: '24',
  MAX_FILE_SIZE_MB: '50',
  ENVIRONMENT: 'test'
}

// Valid test credentials
const validCredentials: AuthCredentials = {
  accountId: 'a1b2c3d4e5f678901234567890123456',
  accessKeyId: '12345678901234567890',
  secretAccessKey: '1234567890123456789012345678901234567890',
  bucketName: 'test-bucket'
}

describe('Auth Handlers', () => {
  let app: Hono<{ Bindings: Bindings }>
  let mockAuthService: any

  beforeEach(() => {
    app = new Hono<{ Bindings: Bindings }>()
    vi.clearAllMocks()
    
    // Get the mocked AuthService constructor
    const { AuthService } = require('../services/auth')
    mockAuthService = new AuthService()
  })

  describe('loginHandler', () => {
    beforeEach(() => {
      app.post('/login', loginHandler)
    })

    it('should return 400 for missing credentials', async () => {
      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toContain('Missing required credentials')
    })

    it('should return 400 for missing accountId', async () => {
      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: '12345678901234567890',
          secretAccessKey: '1234567890123456789012345678901234567890',
          bucketName: 'test-bucket'
        })
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.validateCredentials.mockResolvedValue(false)

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid credentials provided')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_login_failed'],
        doubles: [1],
        indexes: ['test', 'invalid_credentials']
      })
    })

    it('should return 200 and token for valid credentials', async () => {
      const mockToken = 'mock-jwt-token'
      const mockExpiresAt = Date.now() + 86400000

      mockAuthService.validateCredentials.mockResolvedValue(true)
      mockAuthService.createSession.mockResolvedValue({
        token: mockToken,
        expiresAt: mockExpiresAt
      })

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.token).toBe(mockToken)
      expect(data.data.expiresAt).toBe(mockExpiresAt)
      expect(data.data.bucketName).toBe(validCredentials.bucketName)
      expect(data.message).toBe('Authentication successful')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_login_success'],
        doubles: [1],
        indexes: ['test', 'test-bucket']
      })
    })

    it('should return 500 for internal server errors', async () => {
      mockAuthService.validateCredentials.mockRejectedValue(new Error('Database error'))

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Authentication failed')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_login_error'],
        doubles: [1],
        indexes: ['test', 'Database error']
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('logoutHandler', () => {
    beforeEach(() => {
      app.post('/logout', logoutHandler)
    })

    it('should return 400 for missing authorization header', async () => {
      const req = new Request('http://localhost/logout', {
        method: 'POST'
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 400 for invalid authorization header format', async () => {
      const req = new Request('http://localhost/logout', {
        method: 'POST',
        headers: { 'Authorization': 'InvalidFormat token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 200 for successful logout', async () => {
      mockAuthService.revokeSession.mockResolvedValue(true)

      const req = new Request('http://localhost/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Logout successful')
      expect(mockAuthService.revokeSession).toHaveBeenCalledWith('valid-token')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_logout'],
        doubles: [1],
        indexes: ['test', 'success']
      })
    })

    it('should return 200 even when revocation fails', async () => {
      mockAuthService.revokeSession.mockResolvedValue(false)

      const req = new Request('http://localhost/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_logout'],
        doubles: [1],
        indexes: ['test', 'failed']
      })
    })

    it('should return 500 for internal server errors', async () => {
      mockAuthService.revokeSession.mockRejectedValue(new Error('KV error'))

      const req = new Request('http://localhost/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Logout failed')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_logout_error'],
        doubles: [1],
        indexes: ['test', 'KV error']
      })
    })
  })

  describe('verifyHandler', () => {
    beforeEach(() => {
      app.get('/verify', verifyHandler)
    })

    it('should return 400 for missing authorization header', async () => {
      const req = new Request('http://localhost/verify')

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 401 for invalid token', async () => {
      mockAuthService.validateToken.mockResolvedValue(null)

      const req = new Request('http://localhost/verify', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid or expired token')
    })

    it('should return 200 for valid token', async () => {
      const mockSessionData = {
        userId: 'test-user-id',
        credentials: validCredentials,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now()
      }

      mockAuthService.validateToken.mockResolvedValue(mockSessionData)

      const req = new Request('http://localhost/verify', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.valid).toBe(true)
      expect(data.data.bucketName).toBe(validCredentials.bucketName)
      expect(data.data.expiresAt).toBe(mockSessionData.expiresAt)
      expect(data.data.userId).toBe(mockSessionData.userId)
      expect(data.message).toBe('Token is valid')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_verify_success'],
        doubles: [1],
        indexes: ['test', 'test-bucket']
      })
    })

    it('should return 500 for internal server errors', async () => {
      mockAuthService.validateToken.mockRejectedValue(new Error('Validation error'))

      const req = new Request('http://localhost/verify', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Token verification failed')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_verify_error'],
        doubles: [1],
        indexes: ['test', 'Validation error']
      })
    })
  })

  describe('refreshHandler', () => {
    beforeEach(() => {
      app.post('/refresh', refreshHandler)
    })

    it('should return 400 for missing authorization header', async () => {
      const req = new Request('http://localhost/refresh', {
        method: 'POST'
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('No token provided')
    })

    it('should return 401 for invalid token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(null)

      const req = new Request('http://localhost/refresh', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Unable to refresh token')
    })

    it('should return 200 with new token for valid refresh', async () => {
      const mockRefreshResult = {
        token: 'new-jwt-token',
        expiresAt: Date.now() + 86400000
      }

      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult)

      const req = new Request('http://localhost/refresh', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.token).toBe(mockRefreshResult.token)
      expect(data.data.expiresAt).toBe(mockRefreshResult.expiresAt)
      expect(data.message).toBe('Token refreshed successfully')
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-token')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_refresh_success'],
        doubles: [1],
        indexes: ['test']
      })
    })

    it('should return 500 for internal server errors', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh error'))

      const req = new Request('http://localhost/refresh', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Token refresh failed')
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
        blobs: ['auth_refresh_error'],
        doubles: [1],
        indexes: ['test', 'Refresh error']
      })
    })
  })

  describe('handlers without analytics', () => {
    const bindingsWithoutAnalytics = { ...mockBindings, ANALYTICS: undefined }

    it('should work without analytics in loginHandler', async () => {
      app.post('/login-no-analytics', loginHandler)
      mockAuthService.validateCredentials.mockResolvedValue(true)
      mockAuthService.createSession.mockResolvedValue({
        token: 'mock-token',
        expiresAt: Date.now() + 86400000
      })

      const req = new Request('http://localhost/login-no-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCredentials)
      })

      const res = await app.request(req, bindingsWithoutAnalytics)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      // Should not throw error when analytics is undefined
    })
  })
})