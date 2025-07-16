import { describe, it, expect, beforeEach } from 'vitest'
import { env } from 'cloudflare:test'
import { AuthService } from './auth'
import type { AuthCredentials, SessionData } from '../types'

// Declare the test environment types
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    KV_SESSIONS: KVNamespace
    JWT_SECRET: string
    JWT_EXPIRY_HOURS: string
    MAX_FILE_SIZE_MB: string
    ENVIRONMENT: string
  }
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
    authService = new AuthService(env)
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
      // Create credentials that will cause an error during validation
      const invalidCredentials = null as any
      
      const result = await authService.validateCredentials(invalidCredentials)
      expect(result).toBe(false)
    })
  })

  describe('createSession', () => {
    it('should create a session and return a token', async () => {
      const result = await authService.createSession(validCredentials)

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result.token).toBe('string')
      expect(typeof result.expiresAt).toBe('number')
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should store session data in KV and be retrievable', async () => {
      const result = await authService.createSession(validCredentials)
      
      // Validate the token to ensure session was stored correctly
      const sessionData = await authService.validateToken(result.token)
      
      expect(sessionData).not.toBeNull()
      expect(sessionData!.credentials).toEqual(validCredentials)
      expect(typeof sessionData!.userId).toBe('string')
      expect(sessionData!.expiresAt).toBeGreaterThan(sessionData!.createdAt)
    })

    it('should use custom JWT expiry hours from bindings', async () => {
      // Create a custom environment with different expiry
      const customEnv = { ...env, JWT_EXPIRY_HOURS: '48' }
      const customAuthService = new AuthService(customEnv)

      const result = await customAuthService.createSession(validCredentials)
      
      // The expiry should be approximately 48 hours from now
      const expectedExpiry = Date.now() + (48 * 60 * 60 * 1000)
      const tolerance = 5000 // 5 second tolerance
      
      expect(result.expiresAt).toBeGreaterThan(expectedExpiry - tolerance)
      expect(result.expiresAt).toBeLessThan(expectedExpiry + tolerance)
    })
  })

  describe('validateToken', () => {
    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token'

      const result = await authService.validateToken(invalidToken)
      expect(result).toBeNull()
    })

    it('should return session data for valid token', async () => {
      // Create a session first
      const { token } = await authService.createSession(validCredentials)
      
      // Validate the token
      const result = await authService.validateToken(token)
      
      expect(result).not.toBeNull()
      expect(result!.credentials).toEqual(validCredentials)
      expect(typeof result!.userId).toBe('string')
      expect(result!.expiresAt).toBeGreaterThan(result!.createdAt)
    })

    it('should return null for expired session', async () => {
      // Create a session with very short expiry
      const shortExpiryEnv = { ...env, JWT_EXPIRY_HOURS: '0' }
      const shortExpiryAuthService = new AuthService(shortExpiryEnv)
      
      const { token } = await shortExpiryAuthService.createSession(validCredentials)
      
      // Wait a moment to ensure expiry
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const result = await shortExpiryAuthService.validateToken(token)
      console.error('Message:', result)

      expect(result).toBeNull()
    })

    it('should handle malformed session data gracefully', async () => {
      // Create a session first
      const { token } = await authService.createSession(validCredentials)
      
      // Manually corrupt the session data in KV
      const payload = JSON.parse(atob(token.split('.')[1]))
      await env.KV_SESSIONS.put(`session:${payload.sessionId}`, 'invalid-json')
      
      const result = await authService.validateToken(token)
      expect(result).toBeNull()
    })
  })

  describe('revokeSession', () => {
    it('should return false for invalid token', async () => {
      const invalidToken = 'invalid-token'

      const result = await authService.revokeSession(invalidToken)
      expect(result).toBe(false)
    })

    it('should return true and delete session for valid token', async () => {
      const { token } = await authService.createSession(validCredentials)
      const result = await authService.revokeSession(token)

      expect(result).toBe(true)
      
      // Verify session was deleted by trying to validate the token
      const sessionData = await authService.validateToken(token)
      expect(sessionData).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token'

      const result = await authService.refreshToken(invalidToken)
      expect(result).toBeNull()
    })

    it('should create new session and revoke old one for valid token', async () => {
      const { token } = await authService.createSession(validCredentials)
      
      const result = await authService.refreshToken(token)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result!.token).toBe('string')
      expect(typeof result!.expiresAt).toBe('number')
      expect(result!.token).not.toBe(token) // Should be a new token
      
      // Verify old token is no longer valid
      const oldTokenValidation = await authService.validateToken(token)
      expect(oldTokenValidation).toBeNull()
      
      // Verify new token is valid
      const newTokenValidation = await authService.validateToken(result!.token)
      expect(newTokenValidation).not.toBeNull()
      expect(newTokenValidation!.credentials).toEqual(validCredentials)
    })
  })
})