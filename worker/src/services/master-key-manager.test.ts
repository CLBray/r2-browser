import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MasterKeyManager } from './master-key-manager'
import type { Bindings } from '../types'

describe('MasterKeyManager', () => {
  let keyManager: MasterKeyManager
  let mockBindings: Bindings
  let mockKV: any

  beforeEach(() => {
    // Create mock KV namespace
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }

    // Create mock bindings
    mockBindings = {
      CREDENTIAL_ENCRYPTION_KEY: 'primary-key-32-characters-long-for-aes256',
      CREDENTIAL_ENCRYPTION_KEY_BACKUP: 'backup-key-32-characters-long-for-aes256',
      KV_SESSIONS: mockKV,
      R2_BUCKET: {} as R2Bucket,
      ANALYTICS: {} as AnalyticsEngineDataset,
      ASSETS: {} as Fetcher,
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRY_HOURS: '24',
      MAX_FILE_SIZE_MB: '100',
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'debug'
    }

    keyManager = new MasterKeyManager(mockBindings)
  })

  describe('constructor', () => {
    it('should initialize with valid keys', () => {
      expect(() => new MasterKeyManager(mockBindings)).not.toThrow()
    })

    it('should throw error if primary key is missing', () => {
      const invalidBindings = { ...mockBindings, CREDENTIAL_ENCRYPTION_KEY: '' }
      
      expect(() => new MasterKeyManager(invalidBindings))
        .toThrow('CREDENTIAL_ENCRYPTION_KEY environment variable is required')
    })

    it('should throw error if primary key is too short', () => {
      const invalidBindings = { ...mockBindings, CREDENTIAL_ENCRYPTION_KEY: 'short-key' }
      
      expect(() => new MasterKeyManager(invalidBindings))
        .toThrow('Encryption key must be at least 32 characters long for AES-256')
    })

    it('should throw error if key has insufficient entropy', () => {
      const invalidBindings = { ...mockBindings, CREDENTIAL_ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }
      
      expect(() => new MasterKeyManager(invalidBindings))
        .toThrow('Encryption key must have sufficient entropy')
    })

    it('should not warn for good entropy keys', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const goodKey = 'abcdefghijklmnopqrstuvwxyz123456'
      const validBindings = { ...mockBindings, CREDENTIAL_ENCRYPTION_KEY: goodKey }
      
      new MasterKeyManager(validBindings)
      
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getCurrentKey', () => {
    it('should return current key with version', async () => {
      const mockMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      const result = await keyManager.getCurrentKey()
      
      expect(result).toEqual({
        key: mockBindings.CREDENTIAL_ENCRYPTION_KEY,
        version: 1
      })
    })

    it('should initialize metadata if not present', async () => {
      mockKV.get.mockResolvedValue(null)
      
      const result = await keyManager.getCurrentKey()
      
      expect(result).toEqual({
        key: mockBindings.CREDENTIAL_ENCRYPTION_KEY,
        version: 1
      })
      
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:1', expect.any(String))
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:current', expect.any(String))
    })

    it('should handle KV errors gracefully', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'))
      
      await expect(keyManager.getCurrentKey())
        .rejects.toThrow('Unable to retrieve encryption key')
    })
  })

  describe('getKeyByVersion', () => {
    it('should return key for valid version 1', async () => {
      const mockMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      const result = await keyManager.getKeyByVersion(1)
      
      expect(result).toBe(mockBindings.CREDENTIAL_ENCRYPTION_KEY)
    })

    it('should return backup key for version 2', async () => {
      const mockMetadata = {
        version: 2,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      const result = await keyManager.getKeyByVersion(2)
      
      expect(result).toBe(mockBindings.CREDENTIAL_ENCRYPTION_KEY_BACKUP)
    })

    it('should return null for revoked keys', async () => {
      const mockMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'revoked'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      const result = await keyManager.getKeyByVersion(1)
      
      expect(result).toBeNull()
    })

    it('should return null for non-existent versions', async () => {
      mockKV.get.mockResolvedValue(null)
      
      const result = await keyManager.getKeyByVersion(999)
      
      expect(result).toBeNull()
    })

    it('should handle KV errors gracefully', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'))
      
      const result = await keyManager.getKeyByVersion(1)
      
      expect(result).toBeNull()
    })
  })

  describe('getAllValidationKeys', () => {
    it('should return all available keys', async () => {
      const mockMetadata1 = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      const mockMetadata2 = {
        version: 2,
        createdAt: Date.now(),
        status: 'deprecated'
      }
      
      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(mockMetadata1))
        .mockResolvedValueOnce(JSON.stringify(mockMetadata2))
      
      const result = await keyManager.getAllValidationKeys()
      
      expect(result).toEqual([
        { key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, version: 1 },
        { key: mockBindings.CREDENTIAL_ENCRYPTION_KEY_BACKUP, version: 2 }
      ])
    })

    it('should return primary key as fallback on errors', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'))
      
      const result = await keyManager.getAllValidationKeys()
      
      expect(result).toEqual([
        { key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, version: 1 }
      ])
    })

    it('should skip revoked keys', async () => {
      const mockMetadata1 = {
        version: 1,
        createdAt: Date.now(),
        status: 'revoked'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata1))
      
      const result = await keyManager.getAllValidationKeys()
      
      expect(result).toEqual([])
    })
  })

  describe('rotateKey', () => {
    it('should rotate key successfully', async () => {
      const newKey = 'new-key-32-characters-long-for-aes256'
      
      await keyManager.rotateKey(newKey)
      
      // Should update metadata for current key as deprecated
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:1', expect.stringContaining('deprecated'))
      
      // Should create metadata for new key
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:2', expect.stringContaining('active'))
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:current', expect.stringContaining('active'))
    })

    it('should validate new key before rotation', async () => {
      const invalidKey = 'short'
      
      await expect(keyManager.rotateKey(invalidKey))
        .rejects.toThrow('Encryption key must be at least 32 characters long for AES-256')
    })

    it('should handle KV errors during rotation', async () => {
      const newKey = 'new-key-32-characters-long-for-aes256'
      mockKV.put.mockRejectedValue(new Error('KV error'))
      
      await expect(keyManager.rotateKey(newKey))
        .rejects.toThrow('Failed to rotate encryption key')
    })
  })

  describe('revokeKey', () => {
    it('should revoke key successfully', async () => {
      const mockMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      await keyManager.revokeKey(1)
      
      expect(mockKV.put).toHaveBeenCalledWith('key_metadata:1', expect.stringContaining('revoked'))
    })

    it('should throw error for non-existent key version', async () => {
      mockKV.get.mockResolvedValue(null)
      
      await expect(keyManager.revokeKey(999))
        .rejects.toThrow('Key version 999 not found')
    })

    it('should handle KV errors during revocation', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'))
      
      await expect(keyManager.revokeKey(1))
        .rejects.toThrow('Failed to revoke key version 1')
    })
  })

  describe('cleanupExpiredKeys', () => {
    it('should clean up expired keys', async () => {
      const expiredMetadata = {
        version: 1,
        createdAt: Date.now() - 86400000,
        status: 'deprecated',
        expiresAt: Date.now() - 3600000 // Expired 1 hour ago
      }
      
      // Mock responses for different versions - only version 1 has expired metadata
      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(expiredMetadata)) // version 1 - expired
        .mockResolvedValueOnce(null) // version 2 - not found
        .mockResolvedValueOnce(null) // version 3 - not found
      
      const result = await keyManager.cleanupExpiredKeys()
      
      expect(result).toBe(1)
      expect(mockKV.delete).toHaveBeenCalledWith('key_metadata:1')
    })

    it('should not clean up non-expired keys', async () => {
      const activeMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(activeMetadata))
      
      const result = await keyManager.cleanupExpiredKeys()
      
      expect(result).toBe(0)
      expect(mockKV.delete).not.toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      mockKV.get.mockRejectedValue(new Error('KV error'))
      
      const result = await keyManager.cleanupExpiredKeys()
      
      expect(result).toBe(0)
    })
  })

  describe('getKeyMetadata', () => {
    it('should return metadata for specific version', async () => {
      const mockMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get.mockResolvedValue(JSON.stringify(mockMetadata))
      
      const result = await keyManager.getKeyMetadata(1)
      
      expect(result).toEqual(mockMetadata)
    })

    it('should return all metadata when no version specified', async () => {
      const mockMetadata1 = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      mockKV.get
        .mockResolvedValueOnce(JSON.stringify(mockMetadata1))
        .mockResolvedValueOnce(null) // No version 2
      
      const result = await keyManager.getKeyMetadata()
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([mockMetadata1])
    })

    it('should throw error for non-existent version', async () => {
      mockKV.get.mockResolvedValue(null)
      
      await expect(keyManager.getKeyMetadata(999))
        .rejects.toThrow('Key version 999 not found')
    })
  })
})