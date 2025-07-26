import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CredentialEncryptionService } from './credential-encryption'
import { MasterKeyManager } from './master-key-manager'
import type { AuthCredentials, Bindings } from '../types'

// Mock the MasterKeyManager
vi.mock('./master-key-manager')

describe('CredentialEncryptionService', () => {
  let encryptionService: CredentialEncryptionService
  let mockBindings: Bindings
  let mockKeyManager: any
  let testCredentials: AuthCredentials

  beforeEach(() => {
    // Create mock bindings
    mockBindings = {
      CREDENTIAL_ENCRYPTION_KEY: 'test-master-key-32-characters-long-for-aes256',
      CREDENTIAL_ENCRYPTION_KEY_BACKUP: 'backup-key-32-characters-long-for-aes256',
      KV_SESSIONS: {} as KVNamespace,
      R2_BUCKET: {} as R2Bucket,
      ANALYTICS: {} as AnalyticsEngineDataset,
      ASSETS: {} as Fetcher,
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRY_HOURS: '24',
      MAX_FILE_SIZE_MB: '100',
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'debug'
    }

    // Create test credentials
    testCredentials = {
      accountId: 'a1b2c3d4e5f6789012345678901234567890abcd',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      bucketName: 'test-bucket'
    }

    // Mock the key manager
    mockKeyManager = {
      getCurrentKey: vi.fn().mockResolvedValue({ key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, version: 1 }),
      getKeyByVersion: vi.fn().mockResolvedValue(mockBindings.CREDENTIAL_ENCRYPTION_KEY),
      getAllValidationKeys: vi.fn().mockResolvedValue([
        { key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, version: 1 }
      ])
    }

    // Mock the MasterKeyManager constructor
    vi.mocked(MasterKeyManager).mockImplementation(() => mockKeyManager)

    encryptionService = new CredentialEncryptionService(mockBindings)
  })

  describe('encrypt', () => {
    it('should encrypt credentials successfully', async () => {
      const sessionId = 'test-session-id'
      
      const result = await encryptionService.encrypt(testCredentials, sessionId)
      
      expect(result).toHaveProperty('encryptedData')
      expect(result).toHaveProperty('iv')
      expect(result).toHaveProperty('authTag')
      expect(result).toHaveProperty('keyVersion')
      expect(result.keyVersion).toBe(1)
      expect(typeof result.encryptedData).toBe('string')
      expect(typeof result.iv).toBe('string')
      expect(typeof result.authTag).toBe('string')
    })

    it('should generate different encrypted data for same credentials with different session IDs', async () => {
      const sessionId1 = 'session-1'
      const sessionId2 = 'session-2'
      
      const result1 = await encryptionService.encrypt(testCredentials, sessionId1)
      const result2 = await encryptionService.encrypt(testCredentials, sessionId2)
      
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('should generate different encrypted data for same credentials and session ID (due to random IV)', async () => {
      const sessionId = 'test-session-id'
      
      const result1 = await encryptionService.encrypt(testCredentials, sessionId)
      const result2 = await encryptionService.encrypt(testCredentials, sessionId)
      
      // Should be different due to random IV
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('should handle encryption errors gracefully', async () => {
      // Mock getCurrentKey to throw an error
      mockKeyManager.getCurrentKey.mockRejectedValue(new Error('Key retrieval failed'))
      
      await expect(encryptionService.encrypt(testCredentials, 'test-session'))
        .rejects.toThrow('Failed to encrypt credentials')
    })

    it('should use the correct key version from key manager', async () => {
      mockKeyManager.getCurrentKey.mockResolvedValue({ 
        key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, 
        version: 2 
      })
      
      const result = await encryptionService.encrypt(testCredentials, 'test-session')
      
      expect(result.keyVersion).toBe(2)
    })
  })

  describe('decrypt', () => {
    it('should decrypt credentials successfully (round-trip test)', async () => {
      const sessionId = 'test-session-id'
      
      // Encrypt first
      const encrypted = await encryptionService.encrypt(testCredentials, sessionId)
      
      // Then decrypt
      const decrypted = await encryptionService.decrypt(encrypted, sessionId)
      
      expect(decrypted).toEqual(testCredentials)
    })

    it('should fail to decrypt with wrong session ID', async () => {
      const sessionId = 'test-session-id'
      const wrongSessionId = 'wrong-session-id'
      
      // Encrypt with correct session ID
      const encrypted = await encryptionService.encrypt(testCredentials, sessionId)
      
      // Try to decrypt with wrong session ID
      await expect(encryptionService.decrypt(encrypted, wrongSessionId))
        .rejects.toThrow('Failed to decrypt credentials')
    })

    it('should handle missing key version gracefully', async () => {
      const sessionId = 'test-session-id'
      const encrypted = await encryptionService.encrypt(testCredentials, sessionId)
      
      // Mock key manager to return null for the key version
      mockKeyManager.getKeyByVersion.mockResolvedValue(null)
      mockKeyManager.getAllValidationKeys.mockResolvedValue([])
      
      await expect(encryptionService.decrypt(encrypted, sessionId))
        .rejects.toThrow('Failed to decrypt credentials with any available key')
    })

    it('should try fallback decryption with multiple keys', async () => {
      const sessionId = 'test-session-id'
      const encrypted = await encryptionService.encrypt(testCredentials, sessionId)
      
      // Mock primary key to fail, but fallback to succeed
      mockKeyManager.getKeyByVersion.mockResolvedValue(null)
      mockKeyManager.getAllValidationKeys.mockResolvedValue([
        { key: 'wrong-key-32-characters-long-for-test', version: 1 },
        { key: mockBindings.CREDENTIAL_ENCRYPTION_KEY, version: 2 }
      ])
      
      const decrypted = await encryptionService.decrypt(encrypted, sessionId)
      
      expect(decrypted).toEqual(testCredentials)
    })

    it('should validate decrypted credentials structure', async () => {
      const sessionId = 'test-session-id'
      
      // Create malformed encrypted data that would decrypt to invalid JSON
      const malformedEncrypted = {
        encryptedData: 'invalid-base64-data',
        iv: 'dGVzdC1pdg==', // valid base64 for 'test-iv'
        authTag: '', // not used in new implementation
        keyVersion: 1
      }
      
      await expect(encryptionService.decrypt(malformedEncrypted, sessionId))
        .rejects.toThrow('Failed to decrypt credentials')
    })
  })

  describe('key derivation', () => {
    it('should derive different keys for different session IDs', async () => {
      const sessionId1 = 'session-1'
      const sessionId2 = 'session-2'
      
      // Encrypt same credentials with different session IDs
      const encrypted1 = await encryptionService.encrypt(testCredentials, sessionId1)
      const encrypted2 = await encryptionService.encrypt(testCredentials, sessionId2)
      
      // Should not be able to decrypt with wrong session ID
      await expect(encryptionService.decrypt(encrypted1, sessionId2))
        .rejects.toThrow('Failed to decrypt credentials')
      
      await expect(encryptionService.decrypt(encrypted2, sessionId1))
        .rejects.toThrow('Failed to decrypt credentials')
    })
  })

  describe('performance tests', () => {
    it('should encrypt and decrypt within reasonable time limits', async () => {
      const sessionId = 'performance-test-session'
      
      // Test with realistic credential sizes
      const largeCredentials = {
        ...testCredentials,
        // Add some additional data to simulate larger credentials
        metadata: 'x'.repeat(1000) // 1KB of additional data
      } as any
      
      const startTime = Date.now()
      
      // Encrypt
      const encrypted = await encryptionService.encrypt(largeCredentials, sessionId)
      const encryptTime = Date.now() - startTime
      
      // Decrypt
      const decryptStart = Date.now()
      const decrypted = await encryptionService.decrypt(encrypted, sessionId)
      const decryptTime = Date.now() - decryptStart
      
      // Should complete within reasonable time (less than 100ms each)
      expect(encryptTime).toBeLessThan(100)
      expect(decryptTime).toBeLessThan(100)
      
      // Verify correctness
      expect(decrypted).toEqual(largeCredentials)
    })

    it('should handle multiple concurrent encryption operations', async () => {
      const sessionIds = Array.from({ length: 10 }, (_, i) => `session-${i}`)
      
      const startTime = Date.now()
      
      // Run multiple encryptions concurrently
      const encryptPromises = sessionIds.map(sessionId => 
        encryptionService.encrypt(testCredentials, sessionId)
      )
      
      const encryptedResults = await Promise.all(encryptPromises)
      
      // Run multiple decryptions concurrently
      const decryptPromises = encryptedResults.map((encrypted, index) =>
        encryptionService.decrypt(encrypted, sessionIds[index])
      )
      
      const decryptedResults = await Promise.all(decryptPromises)
      
      const totalTime = Date.now() - startTime
      
      // Should complete all operations within reasonable time
      expect(totalTime).toBeLessThan(1000) // 1 second for 20 operations
      
      // Verify all results are correct
      decryptedResults.forEach(decrypted => {
        expect(decrypted).toEqual(testCredentials)
      })
    })
  })

  describe('error handling', () => {
    it('should handle corrupted encrypted data', async () => {
      const sessionId = 'test-session-id'
      
      const corruptedData = {
        encryptedData: 'corrupted-data',
        iv: 'corrupted-iv',
        authTag: '',
        keyVersion: 1
      }
      
      await expect(encryptionService.decrypt(corruptedData, sessionId))
        .rejects.toThrow('Failed to decrypt credentials')
    })

    it('should handle invalid base64 data', async () => {
      const sessionId = 'test-session-id'
      
      const invalidBase64Data = {
        encryptedData: 'invalid-base64!@#$',
        iv: 'invalid-base64!@#$',
        authTag: '',
        keyVersion: 1
      }
      
      await expect(encryptionService.decrypt(invalidBase64Data, sessionId))
        .rejects.toThrow('Failed to decrypt credentials')
    })

    it('should handle empty credentials', async () => {
      const sessionId = 'test-session-id'
      const emptyCredentials = {} as AuthCredentials
      
      // Should encrypt empty object
      const encrypted = await encryptionService.encrypt(emptyCredentials, sessionId)
      
      // Should decrypt but fail validation
      await expect(encryptionService.decrypt(encrypted, sessionId))
        .rejects.toThrow('Failed to decrypt credentials')
    })

    it('should handle null/undefined session IDs', async () => {
      await expect(encryptionService.encrypt(testCredentials, null as any))
        .rejects.toThrow()
      
      await expect(encryptionService.encrypt(testCredentials, undefined as any))
        .rejects.toThrow()
    })
  })

  describe('rotateEncryptionKey', () => {
    it('should throw error indicating direct key manager usage', async () => {
      await expect(encryptionService.rotateEncryptionKey())
        .rejects.toThrow('Key rotation requires new key generation - use MasterKeyManager.rotateKey() directly')
    })
  })
})