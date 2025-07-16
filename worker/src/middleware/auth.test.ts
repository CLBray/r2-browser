import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, optionalAuthMiddleware } from './auth'
import type { Bindings, SessionData } from '../types'

// Mock AuthService
vi.mock('../services/auth', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    validateToken: vi.fn()
  }))
}))

// Mock bindings
const mockBindings: Bindings = {
  R2_BUCKET: {} as R2Bucket,
  KV_SESSIONS: {} as KVNamespace,
  ANALYTICS: undefined,
  ASSETS: {} as Fetcher,
  JWT_SECRET: 'test-secret-key',
  JWT_EXPIRY_HOURS: '24',
  MAX_FILE_SIZE_MB: '50',
  ENVIRONMENT: 'test'
}

// Mock session data
const mockSessionData: SessionData = {
  userId: 'test-user-id',
  credentials: {
    accountId: 'a1b2c3d4e5f678901234567890123456',
    accessKeyId: '12345678901234567890',
    secretAccessKey: '1234567890123456789012345678901234567890',
    bucketName: 'test-bucket'
  },
  expiresAt: Date.now() + 86400000,
  createdAt: Date.now()
}

describe('Auth Middleware', () => {
  let app: Hono<{ Bindings: Bindings }>
  let mockAuthService: any

  beforeEach(() => {
    app = new Hono<{ Bindings: Bindings }>()
    vi.clearAllMocks()
    
    // Get the mocked AuthService constructor
    const { AuthService } = require('../services/auth')
    mockAuthService = new AuthService()
  })

  describe('authMiddleware', () => {
    beforeEach(() => {
      app.get('/protected', authMiddleware, (c) => {
        const sessionData = c.get('sessionData')
        return c.json({ 
          success: true, 
          userId: sessionData.userId,
          bucketName: sessionData.credentials.bucketName
        })
      })
    })

    it('should return 401 for missing authorization header', async () => {
      const req = new Request('http://localhost/protected')

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for invalid authorization header format', async () => {
      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'InvalidFormat token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for empty Bearer token', async () => {
      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'Bearer ' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid or expired token')
    })

    it('should return 401 for invalid token', async () => {
      mockAuthService.validateToken.mockResolvedValue(null)

      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Invalid or expired token')
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('invalid-token')
    })

    it('should allow access and set session data for valid token', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockSessionData)

      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.userId).toBe(mockSessionData.userId)
      expect(data.bucketName).toBe(mockSessionData.credentials.bucketName)
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token')
    })

    it('should return 500 for internal server errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAuthService.validateToken.mockRejectedValue(new Error('Database error'))

      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Authentication failed')
      expect(consoleSpy).toHaveBeenCalledWith('Auth middleware error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should extract token correctly from Bearer header', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockSessionData)

      const req = new Request('http://localhost/protected', {
        headers: { 'Authorization': 'Bearer my-jwt-token-here' }
      })

      await app.request(req, mockBindings)

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('my-jwt-token-here')
    })
  })

  describe('optionalAuthMiddleware', () => {
    beforeEach(() => {
      app.get('/optional', optionalAuthMiddleware, (c) => {
        const sessionData = c.get('sessionData')
        return c.json({ 
          success: true, 
          authenticated: !!sessionData,
          userId: sessionData?.userId || null,
          bucketName: sessionData?.credentials?.bucketName || null
        })
      })
    })

    it('should allow access without authorization header', async () => {
      const req = new Request('http://localhost/optional')

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(false)
      expect(data.userId).toBeNull()
      expect(data.bucketName).toBeNull()
    })

    it('should allow access with invalid authorization header format', async () => {
      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'InvalidFormat token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(false)
    })

    it('should allow access with invalid token', async () => {
      mockAuthService.validateToken.mockResolvedValue(null)

      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(false)
      expect(data.userId).toBeNull()
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('invalid-token')
    })

    it('should set session data for valid token', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockSessionData)

      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(true)
      expect(data.userId).toBe(mockSessionData.userId)
      expect(data.bucketName).toBe(mockSessionData.credentials.bucketName)
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token')
    })

    it('should continue without authentication on validation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockAuthService.validateToken.mockRejectedValue(new Error('Database error'))

      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'Bearer valid-token' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Optional auth middleware error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle empty Bearer token gracefully', async () => {
      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'Bearer ' }
      })

      const res = await app.request(req, mockBindings)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.authenticated).toBe(false)
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('')
    })

    it('should not call validateToken when no auth header is present', async () => {
      const req = new Request('http://localhost/optional')

      await app.request(req, mockBindings)

      expect(mockAuthService.validateToken).not.toHaveBeenCalled()
    })

    it('should not call validateToken for non-Bearer auth headers', async () => {
      const req = new Request('http://localhost/optional', {
        headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
      })

      await app.request(req, mockBindings)

      expect(mockAuthService.validateToken).not.toHaveBeenCalled()
    })
  })
})