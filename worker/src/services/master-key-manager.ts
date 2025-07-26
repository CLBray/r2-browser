import type { Bindings } from '../types'

export interface KeyMetadata {
  version: number
  createdAt: number
  status: 'active' | 'deprecated' | 'revoked'
  expiresAt?: number
}

export class MasterKeyManager {
  private kv: KVNamespace
  private primaryKey: string
  private backupKey?: string
  private currentVersion: number = 1

  constructor(bindings: Bindings) {
    this.kv = bindings.KV_SESSIONS
    this.primaryKey = bindings.CREDENTIAL_ENCRYPTION_KEY
    this.backupKey = bindings.CREDENTIAL_ENCRYPTION_KEY_BACKUP
    
    if (!this.primaryKey) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is required')
    }
    
    this.validateKey(this.primaryKey)
    if (this.backupKey) {
      this.validateKey(this.backupKey)
    }
  }

  /**
   * Get the current active key for encryption operations
   */
  async getCurrentKey(): Promise<{ key: string; version: number }> {
    try {
      // Check if we have stored key metadata
      const metadataStr = await this.kv.get('key_metadata:current')
      if (metadataStr) {
        const metadata: KeyMetadata = JSON.parse(metadataStr)
        if (metadata.status === 'active') {
          return {
            key: this.primaryKey,
            version: metadata.version
          }
        }
      }
      
      // Default to primary key with version 1
      await this.initializeKeyMetadata()
      return {
        key: this.primaryKey,
        version: this.currentVersion
      }
    } catch (error) {
      console.error('Failed to get current key:', error)
      throw new Error('Unable to retrieve encryption key')
    }
  }

  /**
   * Get key by version for decryption operations
   */
  async getKeyByVersion(version: number): Promise<string | null> {
    try {
      const metadataStr = await this.kv.get(`key_metadata:${version}`)
      if (!metadataStr) {
        return null
      }
      
      const metadata: KeyMetadata = JSON.parse(metadataStr)
      
      // Don't allow revoked keys
      if (metadata.status === 'revoked') {
        return null
      }
      
      // Return appropriate key based on version
      if (version === 1) {
        return this.primaryKey
      } else if (version === 2 && this.backupKey) {
        return this.backupKey
      }
      
      return null
    } catch (error) {
      console.error(`Failed to get key version ${version}:`, error)
      return null
    }
  }

  /**
   * Get all available keys for validation attempts
   */
  async getAllValidationKeys(): Promise<Array<{ key: string; version: number }>> {
    const keys: Array<{ key: string; version: number }> = []
    
    try {
      // Check version 1 (primary key)
      const key1 = await this.getKeyByVersion(1)
      if (key1) {
        keys.push({ key: key1, version: 1 })
      }
      
      // Check version 2 (backup key)
      if (this.backupKey) {
        const key2 = await this.getKeyByVersion(2)
        if (key2) {
          keys.push({ key: key2, version: 2 })
        }
      }
      
      return keys
    } catch (error) {
      console.error('Failed to get validation keys:', error)
      return keys.length > 0 ? keys : [{ key: this.primaryKey, version: 1 }]
    }
  }

  /**
   * Rotate to a new key (placeholder for future implementation)
   */
  async rotateKey(newKey: string): Promise<void> {
    this.validateKey(newKey)
    
    try {
      // This would implement the key rotation logic
      // 1. Store new key as backup
      // 2. Update metadata to mark current key as deprecated
      // 3. Set new key as active
      // 4. Schedule cleanup of old key after transition period
      
      const now = Date.now()
      const newVersion = this.currentVersion + 1
      
      // Mark current key as deprecated
      const currentMetadata: KeyMetadata = {
        version: this.currentVersion,
        createdAt: now - 86400000, // Assume created yesterday for example
        status: 'deprecated',
        expiresAt: now + (24 * 60 * 60 * 1000) // Expire in 24 hours
      }
      
      await this.kv.put(`key_metadata:${this.currentVersion}`, JSON.stringify(currentMetadata))
      
      // Create metadata for new key
      const newMetadata: KeyMetadata = {
        version: newVersion,
        createdAt: now,
        status: 'active'
      }
      
      await this.kv.put(`key_metadata:${newVersion}`, JSON.stringify(newMetadata))
      await this.kv.put('key_metadata:current', JSON.stringify(newMetadata))
      
      this.currentVersion = newVersion
      
      console.log(`Key rotated from version ${this.currentVersion - 1} to ${newVersion}`)
    } catch (error) {
      console.error('Key rotation failed:', error)
      throw new Error('Failed to rotate encryption key')
    }
  }

  /**
   * Revoke a specific key version
   */
  async revokeKey(version: number): Promise<void> {
    try {
      const metadataStr = await this.kv.get(`key_metadata:${version}`)
      if (!metadataStr) {
        throw new Error(`Key version ${version} not found`)
      }
      
      const metadata: KeyMetadata = JSON.parse(metadataStr)
      metadata.status = 'revoked'
      metadata.expiresAt = Date.now() // Expire immediately
      
      await this.kv.put(`key_metadata:${version}`, JSON.stringify(metadata))
      
      console.log(`Key version ${version} has been revoked`)
    } catch (error) {
      console.error(`Failed to revoke key version ${version}:`, error)
      throw new Error(`Failed to revoke key version ${version}`)
    }
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    let cleanedCount = 0
    const now = Date.now()
    
    try {
      // This would iterate through all key metadata and clean up expired ones
      // For now, we'll check the known versions
      for (let version = 1; version <= this.currentVersion + 1; version++) {
        const metadataStr = await this.kv.get(`key_metadata:${version}`)
        if (metadataStr) {
          const metadata: KeyMetadata = JSON.parse(metadataStr)
          if (metadata.expiresAt && metadata.expiresAt < now) {
            await this.kv.delete(`key_metadata:${version}`)
            cleanedCount++
            console.log(`Cleaned up expired key version ${version}`)
          }
        }
      }
    } catch (error) {
      console.error('Key cleanup failed:', error)
    }
    
    return cleanedCount
  }

  /**
   * Validate key format and security requirements
   */
  private validateKey(key: string): void {
    if (!key) {
      throw new Error('Encryption key cannot be empty')
    }
    
    if (key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long for AES-256')
    }
    
    // Check for basic entropy (not all same character)
    const uniqueChars = new Set(key).size
    if (uniqueChars < 8) {
      throw new Error('Encryption key must have sufficient entropy')
    }
    
    // Warn if key appears to be a simple pattern
    if (/^(.)\1+$/.test(key) || /^(..)\1+$/.test(key)) {
      console.warn('Warning: Encryption key appears to have low entropy')
    }
  }

  /**
   * Initialize key metadata if not present
   */
  private async initializeKeyMetadata(): Promise<void> {
    try {
      const metadata: KeyMetadata = {
        version: 1,
        createdAt: Date.now(),
        status: 'active'
      }
      
      await this.kv.put('key_metadata:1', JSON.stringify(metadata))
      await this.kv.put('key_metadata:current', JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to initialize key metadata:', error)
      throw new Error('Failed to initialize key management system')
    }
  }

  /**
   * Get key metadata for monitoring and debugging
   */
  async getKeyMetadata(version?: number): Promise<KeyMetadata | KeyMetadata[]> {
    try {
      if (version) {
        const metadataStr = await this.kv.get(`key_metadata:${version}`)
        if (!metadataStr) {
          throw new Error(`Key version ${version} not found`)
        }
        return JSON.parse(metadataStr)
      } else {
        // Return all key metadata
        const allMetadata: KeyMetadata[] = []
        for (let v = 1; v <= this.currentVersion + 1; v++) {
          const metadataStr = await this.kv.get(`key_metadata:${v}`)
          if (metadataStr) {
            allMetadata.push(JSON.parse(metadataStr))
          }
        }
        return allMetadata
      }
    } catch (error) {
      console.error('Failed to get key metadata:', error)
      throw new Error('Failed to retrieve key metadata')
    }
  }
}