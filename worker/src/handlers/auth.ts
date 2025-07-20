import type { Context } from 'hono'
import { AuthService } from '../services/auth'
import type { AuthCredentials, Bindings } from '../types'

/**
 * Handle user login with R2 credentials
 */
export const loginHandler = async (c: Context<{ Bindings: Bindings }>) => {
  try {
    const body = await c.req.json()
    
    // Validate request body
    const { accountId, accessKeyId, secretAccessKey, bucketName } = body
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return c.json({
        success: false,
        error: 'Bad Request',
        message: 'Missing required credentials: accountId, accessKeyId, secretAccessKey, bucketName'
      }, 400)
    }

    const credentials: AuthCredentials = {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName
    }

    const authService = new AuthService(c.env)

    // Validate credentials
    const isValid = await authService.validateCredentials(credentials)
    if (!isValid) {
      // Track failed login attempt
      if (c.env.ANALYTICS) {
        c.env.ANALYTICS.writeDataPoint({
          blobs: ['auth_login_failed'],
          doubles: [1],
          indexes: [c.env.ENVIRONMENT, 'invalid_credentials']
        })
      }

      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid credentials provided'
      }, 401)
    }

    // Create session
    const { token, expiresAt } = await authService.createSession(credentials)

    // Track successful login
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_login_success'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, bucketName]
      })
    }

    return c.json({
      success: true,
      data: {
        token,
        expiresAt,
        bucketName
      },
      message: 'Authentication successful'
    })
  } catch (error) {
    console.error('Login handler error:', error)

    // Track login error
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_login_error'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
      })
    }

    return c.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed'
    }, 500)
  }
}

/**
 * Handle user logout
 */
export const logoutHandler = async (c: Context<{ Bindings: Bindings }>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Bad Request',
        message: 'No token provided'
      }, 400)
    }

    const token = authHeader.substring(7)
    const authService = new AuthService(c.env)

    // Revoke session
    const revoked = await authService.revokeSession(token)

    // Track logout
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_logout'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, revoked ? 'success' : 'failed']
      })
    }

    return c.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Logout handler error:', error)

    // Track logout error
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_logout_error'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
      })
    }

    return c.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Logout failed'
    }, 500)
  }
}

/**
 * Verify token validity
 */
export const verifyHandler = async (c: Context<{ Bindings: Bindings }>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Bad Request',
        message: 'No token provided'
      }, 400)
    }

    const token = authHeader.substring(7)
    const authService = new AuthService(c.env)

    // Validate token
    const sessionData = await authService.validateToken(token)

    if (!sessionData) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      }, 401)
    }

    // Track token verification
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_verify_success'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, sessionData.credentials.bucketName]
      })
    }

    return c.json({
      success: true,
      data: {
        valid: true,
        bucketName: sessionData.credentials.bucketName,
        expiresAt: sessionData.expiresAt,
        userId: sessionData.userId
      },
      message: 'Token is valid'
    })
  } catch (error) {
    console.error('Verify handler error:', error)

    // Track verification error
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_verify_error'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
      })
    }

    return c.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Token verification failed'
    }, 500)
  }
}

/**
 * Refresh an existing token
 */
export const refreshHandler = async (c: Context<{ Bindings: Bindings }>) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Bad Request',
        message: 'No token provided'
      }, 400)
    }

    const token = authHeader.substring(7)
    const authService = new AuthService(c.env)

    // Refresh token
    const refreshResult = await authService.refreshToken(token)

    if (!refreshResult) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Unable to refresh token'
      }, 401)
    }

    // Track token refresh
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_refresh_success'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT]
      })
    }

    return c.json({
      success: true,
      data: {
        token: refreshResult.token,
        expiresAt: refreshResult.expiresAt
      },
      message: 'Token refreshed successfully'
    })
  } catch (error) {
    console.error('Refresh handler error:', error)

    // Track refresh error
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: ['auth_refresh_error'],
        doubles: [1],
        indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
      })
    }

    return c.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Token refresh failed'
    }, 500)
  }
}