import type { AuthCredentials, EncryptedCredentials, Bindings } from '../types'
import { MasterKeyManager } from './master-key-manager'

export class CredentialEncryptionService {
  private keyManager: MasterKeyManager

  constructor(bindings: Bindings) {
    this.keyManager = new MasterKeyManager(bindings)
  }

  /**
   * Encrypt credentials using AES-256-GCM with PBKDF2 key derivation
   */
  async encrypt(credentials: AuthCredentials, sessionId: string): Promise<EncryptedCredentials> {
    try {
      // Get current encryption key
      const { key: masterKey, version: keyVersion } = await this.keyManager.getCurrentKey()
      
      // Generate a random IV (12 bytes for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Derive session-specific key using PBKDF2
      const derivedKey = await this.deriveKey(sessionId, masterKey)
      
      // Convert credentials to JSON string
      const credentialsJson = JSON.stringify(credentials)
      const encoder = new TextEncoder()
      const data = encoder.encode(credentialsJson)
      
      // Encrypt using AES-256-GCM
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        derivedKey,
        data
      )
      
      // In GCM mode, the encrypted data includes the auth tag at the end
      // We'll store the entire encrypted result (data + tag) as one piece
      return {
        encryptedData: this.arrayBufferToBase64(encryptedData),
        iv: this.arrayBufferToBase64(iv),
        authTag: '', // Not needed since it's included in encryptedData
        keyVersion: keyVersion
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt credentials')
    }
  }

  /**
   * Decrypt credentials using AES-256-GCM with PBKDF2 key derivation
   */
  async decrypt(encryptedData: EncryptedCredentials, sessionId: string): Promise<AuthCredentials> {
    try {
      // Get the appropriate key based on version
      const keyToUse = await this.keyManager.getKeyByVersion(encryptedData.keyVersion)
      if (!keyToUse) {
        throw new Error(`Encryption key version ${encryptedData.keyVersion} not available`)
      }
      
      // Derive session-specific key using PBKDF2
      const derivedKey = await this.deriveKey(sessionId, keyToUse)
      
      // Convert base64 strings back to ArrayBuffers
      const iv = this.base64ToArrayBuffer(encryptedData.iv)
      const encrypted = this.base64ToArrayBuffer(encryptedData.encryptedData)
      
      // Decrypt using AES-256-GCM (the auth tag is included in the encrypted data)
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        derivedKey,
        encrypted
      )
      
      // Convert decrypted data back to credentials object
      const decoder = new TextDecoder()
      const credentialsJson = decoder.decode(decryptedData)
      const credentials = JSON.parse(credentialsJson) as AuthCredentials
      
      // Validate the decrypted credentials structure
      if (!this.isValidCredentialsStructure(credentials)) {
        throw new Error('Decrypted data does not match expected credentials structure')
      }
      
      return credentials
    } catch (error) {
      console.error('Decryption failed:', error)
      
      // Try fallback decryption with all available keys
      return await this.tryFallbackDecryption(encryptedData, sessionId)
    }
  }

  /**
   * Rotate encryption key using the master key manager
   */
  async rotateEncryptionKey(): Promise<void> {
    // This would generate a new key and call the key manager's rotate method
    // For now, we'll delegate to the key manager
    throw new Error('Key rotation requires new key generation - use MasterKeyManager.rotateKey() directly')
  }

  /**
   * Try fallback decryption with all available keys
   */
  private async tryFallbackDecryption(encryptedData: EncryptedCredentials, sessionId: string): Promise<AuthCredentials> {
    const availableKeys = await this.keyManager.getAllValidationKeys()
    
    for (const { key, version } of availableKeys) {
      try {
        // Create a modified encrypted data object with the current key version
        const modifiedEncryptedData = { ...encryptedData, keyVersion: version }
        
        // Derive session-specific key using PBKDF2
        const derivedKey = await this.deriveKey(sessionId, key)
        
        // Convert base64 strings back to ArrayBuffers
        const iv = this.base64ToArrayBuffer(encryptedData.iv)
        const encrypted = this.base64ToArrayBuffer(encryptedData.encryptedData)
        
        // Decrypt using AES-256-GCM (the auth tag is included in the encrypted data)
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(iv)
          },
          derivedKey,
          encrypted
        )
        
        // Convert decrypted data back to credentials object
        const decoder = new TextDecoder()
        const credentialsJson = decoder.decode(decryptedData)
        const credentials = JSON.parse(credentialsJson) as AuthCredentials
        
        // Validate the decrypted credentials structure
        if (this.isValidCredentialsStructure(credentials)) {
          console.log(`Fallback decryption successful with key version ${version}`)
          return credentials
        }
      } catch (error) {
        // Continue to next key
        console.log(`Fallback decryption failed with key version ${version}`)
      }
    }
    
    throw new Error('Failed to decrypt credentials with any available key')
  }

  /**
   * Derive a session-specific key using PBKDF2
   */
  private async deriveKey(sessionId: string, masterKey: string): Promise<CryptoKey> {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID must be a non-empty string')
    }
    
    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Master key must be a non-empty string')
    }
    
    const encoder = new TextEncoder()
    
    // Create salt by combining master key and session ID
    const salt = encoder.encode(masterKey + sessionId + 'r2-file-explorer-salt')
    
    // Import the master key as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterKey),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    
    // Derive the actual encryption key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // 100,000 iterations as specified
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256 // 256-bit key for AES-256
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Validate that decrypted data has the expected credentials structure
   */
  private isValidCredentialsStructure(obj: any): obj is AuthCredentials {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.accountId === 'string' &&
      typeof obj.accessKeyId === 'string' &&
      typeof obj.secretAccessKey === 'string' &&
      typeof obj.bucketName === 'string'
    )
  }
}