import jwt from '@tsndr/cloudflare-worker-jwt'
import { v4 as uuidv4 } from 'uuid'
import type { AuthCredentials, SessionData, JWTPayload, Bindings } from '../types'

export class AuthService {
  private kv: KVNamespace
  private jwtSecret: string
  private jwtExpiryHours: number

  constructor(bindings: Bindings) {
    this.kv = bindings.KV_SESSIONS
    this.jwtSecret = bindings.JWT_SECRET
    this.jwtExpiryHours = parseInt(bindings.JWT_EXPIRY_HOURS) || 24
  }

  /**
   * Validate R2 credentials by checking if they contain required fields
   * Note: Full validation would require testing against R2 API, but for now we do basic validation
   */
  async validateCredentials(credentials: AuthCredentials): Promise<boolean> {
    try {
      // Basic validation - check if all required fields are present
      if (!credentials.accountId || !credentials.accessKeyId || !credentials.secretAccessKey || !credentials.bucketName) {
        return false
      }

      // Check format of account ID (should be 32 character hex string)
      if (!/^[a-f0-9]{32}$/.test(credentials.accountId)) {
        return false
      }

      // Check format of access key ID (should be 20 characters)
      if (credentials.accessKeyId.length !== 20) {
        return false
      }

      // Check format of secret access key (should be 40 characters)
      if (credentials.secretAccessKey.length !== 40) {
        return false
      }

      // Check bucket name format (basic DNS-compliant name check)
      if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(credentials.bucketName) || credentials.bucketName.length < 3 || credentials.bucketName.length > 63) {
        return false
      }

      return true
    } catch (error) {
      console.error('Credential validation error:', error)
      return false
    }
  }

  /**
   * Create a new session with the provided credentials
   */
  async createSession(credentials: AuthCredentials): Promise<{ token: string; expiresAt: number }> {
    const sessionId = uuidv4()
    const userId = uuidv4() // Generate a unique user ID for this session
    const now = Date.now()
    const expiresAt = now + (this.jwtExpiryHours * 60 * 60 * 1000)

    // Create session data
    const sessionData: SessionData = {
      userId,
      credentials,
      expiresAt,
      createdAt: now
    }

    // Store session in KV
    await this.kv.put(`session:${sessionId}`, JSON.stringify(sessionData), {
      expirationTtl: this.jwtExpiryHours * 60 * 60 // TTL in seconds
    })

    // Generate JWT token
    const token = await this.generateJWT(userId, sessionId)

    return { token, expiresAt }
  }

  /**
   * Validate a JWT token and return session data
   */
  async validateToken(token: string): Promise<SessionData | null> {
    try {
      // Verify JWT
      const isValid = await jwt.verify(token, this.jwtSecret)
      if (!isValid) {
        return null
      }

      const payload = jwt.decode(token).payload as JWTPayload
      
      // Get session from KV
      const sessionKey = `session:${payload.sessionId}`
      const sessionDataStr = await this.kv.get(sessionKey)
      
      if (!sessionDataStr) {
        return null
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr)
      
      // Check if session is expired
      if (sessionData.expiresAt < Date.now()) {
        // Clean up expired session
        await this.kv.delete(sessionKey)
        return null
      }

      return sessionData
    } catch (error) {
      console.error('Token validation error:', error)
      return null
    }
  }

  /**
   * Revoke a session by deleting it from KV
   */
  async revokeSession(token: string): Promise<boolean> {
    try {
      const isValid = await jwt.verify(token, this.jwtSecret)
      if (!isValid) {
        return false
      }
      
      const payload = jwt.decode(token).payload as JWTPayload
      await this.kv.delete(`session:${payload.sessionId}`)
      return true
    } catch (error) {
      console.error('Session revocation error:', error)
      return false
    }
  }

  /**
   * Refresh a token by creating a new session with the same credentials
   */
  async refreshToken(token: string): Promise<{ token: string; expiresAt: number } | null> {
    try {
      const sessionData = await this.validateToken(token)
      if (!sessionData) {
        return null
      }

      // Revoke old session
      await this.revokeSession(token)

      // Create new session with same credentials
      return await this.createSession(sessionData.credentials)
    } catch (error) {
      console.error('Token refresh error:', error)
      return null
    }
  }

  /**
   * Generate a JWT token
   */
  private async generateJWT(userId: string, sessionId: string): Promise<string> {
    const payload: JWTPayload = {
      userId,
      sessionId,
      exp: Math.floor(Date.now() / 1000) + (this.jwtExpiryHours * 60 * 60),
      iat: Math.floor(Date.now() / 1000)
    }

    return await jwt.sign(payload, this.jwtSecret)
  }


}