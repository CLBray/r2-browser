import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from './auth'
import type { Bindings, AuthCredentials, SessionData } from '../types'

// Mock KV namespace
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}

// Mock bindings
const mockBindings: Bindings = {
  R2_BUCKET: {} as R2Bucket,
  KV_SESSIONS: mockKV as any,
  ANALYTICS: undefined,
  ASSETS: {} as Fetcher,
  JWT_SECRET: 'test-secret-key-that-is-long-enough-for-jwt',
  JWT_EXPIRY_HOURS: '24',
  MAX_FILE_SIZE_MB: '50',
  ENVIRONMENT: 'test'
}

// Valid test credentials
const validCredentials: AuthCredentials = {
  accountId: 'a1b2c3d4e5f678901234567890123456', // exactly 32 hex characters
  accessKeyId: '12345678901234567890', // exactly 20 characters
  secretAccessKey: '1234567890123456789012345678901234567890', // exactly 40 characters
  bucketName: 'test-bucket'
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService(mockBindings)
    vi.clearAllMocks()
  })

  describe('validateCredentials', () => {
    it('should return false for missing accountId', async () => {
      const invalidCredentials = {
        accountId: '',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for missing accessKeyId', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for missing secretAccessKey', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for missing bucketName', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: ''
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for invalid account ID format (non-hex)', async () => {
      const invalidCredentials = {
        accountId: 'invalid-format-not-hex-string-here',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for account ID with wrong length', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f6789', // too short
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for access key ID too short', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: 'short',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for access key ID too long', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '123456789012345678901', // 21 characters
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for secret access key too short', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: 'short',
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for secret access key too long', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '12345678901234567890123456789012345678901', // 41 characters
        bucketName: 'test-bucket'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for bucket name with invalid characters', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'Invalid_Bucket_Name'
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for bucket name too short', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'ab' // only 2 characters
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return false for bucket name too long', async () => {
      const invalidCredentials = {
        accountId: 'a1b2c3d4e5f678901234567890123456',
        accessKeyId: '12345678901234567890',
        secretAccessKey: '1234567890123456789012345678901234567890',
        bucketName: 'a'.repeat(64) // 64 characters, exceeds 63 limit
      } as AuthCredentials

      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })

    it('should return true for valid credentials', async () => {
      const result = await authService.validateCredentials(validCredentials)
      expect(result).toBe(true)
    })

    it('should return false when validation throws an error', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Create credentials that will cause an error during validation
      const invalidCredentials = null as any
      
      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Credential validation error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('createSession', () => {
    it('should create a session and return a token', async () => {
      mockKV.put.mockResolvedValue(undefined)

      const result = await authService.createSession(validCredentials)

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result.token).toBe('string')
      expect(typeof result.expiresAt).toBe('number')
      expect(result.expiresAt).toBeGreaterThan(Date.now())
      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^session:/),
        expect.stringContaining('"credentials"'),
        { expirationTtl: 24 * 60 * 60 }
      )
    })

    it('should store session data with correct structure', async () => {
      mockKV.put.mockResolvedValue(undefined)

      await authService.createSession(validCredentials)

      const putCall = mockKV.put.mock.calls[0]
      const sessionData = JSON.parse(putCall[1])

      expect(sessionData).toHaveProperty('userId')
      expect(sessionData).toHaveProperty('credentials')
      expect(sessionData).toHaveProperty('expiresAt')
      expect(sessionData).toHaveProperty('createdAt')
      expect(sessionData.credentials).toEqual(validCredentials)
      expect(typeof sessionData.userId).toBe('string')
      expect(sessionData.expiresAt).toBeGreaterThan(sessionData.createdAt)
    })

    it('should use custom JWT expiry hours from bindings', async () => {
      const customBindings = { ...mockBindings, JWT_EXPIRY_HOURS: '48' }
      const customAuthService = new AuthService(customBindings)
      mockKV.put.mockResolvedValue(undefined)

      await customAuthService.createSession(validCredentials)

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^session:/),
        expect.any(String),
        { expirationTtl: 48 * 60 * 60 }
      )
    })
  })

  describe('validateToken', () => {
    it('should return null for invalid token', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const invalidToken = 'invalid-token'

      const result = await authService.validateToken(invalidToken)
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Token validation error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should return null when session not found in KV', async () => {
      mockKV.put.mockResolvedValue(undefined)
      const { token } = await authService.createSession(validCredentials)

      // Mock KV to return null (session not found)
      mockKV.get.mockResolvedValue(null)

      const result = await authService.validateToken(token)
      expect(result).toBeNull()
    })

    it('should return session data for valid token with valid session', async () => {
      const now = Date.now()
      const expiresAt = now + (24 * 60 * 60 * 1000)
      
      const sessionData: SessionData = {
        userId: 'test-user-id',
        credentials: validCredentials,
        expiresAt,
        createdAt: now
      }

      mockKV.put.mockResolvedValue(undefined)
      const { token } = await authService.createSession(validCredentials)
      
      mockKV.get.mockResolvedValue(JSON.stringify(sessionData))

      const result = await authService.validateToken(token)
      expect(result).toEqual(sessionData)
    })

    it('should return null and clean up expired session', async () => {
      const now = Date.now()
      const expiredTime = now - 1000 // 1 second ago
      
      const expiredSessionData: SessionData = {
        userId: 'test-user-id',
        credentials: validCredentials,
        expiresAt: expiredTime,
        createdAt: now - (25 * 60 * 60 * 1000)
      }

      mockKV.put.mockResolvedValue(undefined)
      mockKV.delete.mockResolvedValue(undefined)
      const { token } = await authService.createSession(validCredentials)
      
      mockKV.get.mockResolvedValue(JSON.stringify(expiredSessionData))

      const result = await authService.validateToken(token)
      expect(result).toBeNull()
      expect(mockKV.delete).toHaveBeenCalledWith(expect.stringMatching(/^session:/))
    })

    it('should handle JSON parse errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockKV.put.mockResolvedValue(undefined)
      const { token } = await authService.createSession(validCredentials)
      
      mockKV.get.mockResolvedValue('invalid-json')

      const result = await authService.validateToken(token)
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Token validation error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('revokeSession', () => {
    it('should return false for invalid token', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const invalidToken = 'invalid-token'

      const result = await authService.revokeSession(invalidToken)
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Session revocation error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should return true and delete session for valid token', async () => {
      mockKV.put.mockResolvedValue(undefined)
      mockKV.delete.mockResolvedValue(undefined)

      const { token } = await authService.createSession(validCredentials)
      const result = await authService.revokeSession(token)

      expect(result).toBe(true)
      expect(mockKV.delete).toHaveBeenCalledWith(expect.stringMatching(/^session:/))
    })

    it('should handle KV delete errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockKV.put.mockResolvedValue(undefined)
      mockKV.delete.mockRejectedValue(new Error('KV delete failed'))

      const { token } = await authService.createSession(validCredentials)
      const result = await authService.revokeSession(token)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Session revocation error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('refreshToken', () => {
    it('should return null for invalid token', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const invalidToken = 'invalid-token'

      const result = await authService.refreshToken(invalidToken)
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Token refresh error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should return null when session validation fails', async () => {
      mockKV.put.mockResolvedValue(undefined)
      const { token } = await authService.createSession(validCredentials)
      
      // Mock validateToken to return null
      mockKV.get.mockResolvedValue(null)

      const result = await authService.refreshToken(token)
      expect(result).toBeNull()
    })

    it('should create new session and revoke old one for valid token', async () => {
      const now = Date.now()
      const expiresAt = now + (24 * 60 * 60 * 1000)
      
      const sessionData: SessionData = {
        userId: 'test-user-id',
        credentials: validCredentials,
        expiresAt,
        createdAt: now
      }

      mockKV.put.mockResolvedValue(undefined)
      mockKV.delete.mockResolvedValue(undefined)
      
      const { token } = await authService.createSession(validCredentials)
      
      // Mock successful session validation
      mockKV.get.mockResolvedValue(JSON.stringify(sessionData))

      const result = await authService.refreshToken(token)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result!.token).toBe('string')
      expect(typeof result!.expiresAt).toBe('number')
      expect(result!.token).not.toBe(token) // Should be a new token
      expect(mockKV.delete).toHaveBeenCalled() // Old session should be revoked
    })

    it('should handle refresh errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock KV operations to throw errors
      mockKV.put.mockRejectedValue(new Error('KV put failed'))
      
      const result = await authService.refreshToken('some-token')
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Token refresh error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})