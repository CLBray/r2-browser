import type { Context, Next } from 'hono'
import { AuthService } from '../services/auth'
import type { Bindings, SessionData } from '../types'

// Extend Hono's context to include session data
declare module 'hono' {
  interface ContextVariableMap {
    sessionData: SessionData
  }
}

/**
 * Authentication middleware that validates JWT tokens and loads session data
 */
export const authMiddleware = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      }, 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Validate token using AuthService
    const authService = new AuthService(c.env)
    const sessionData = await authService.validateToken(token)

    if (!sessionData) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      }, 401)
    }

    // Store session data in context for use in route handlers
    c.set('sessionData', sessionData)

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed'
    }, 500)
  }
}

/**
 * Optional authentication middleware that doesn't fail if no token is provided
 * Useful for endpoints that can work with or without authentication
 */
export const optionalAuthMiddleware = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const authService = new AuthService(c.env)
      const sessionData = await authService.validateToken(token)
      
      if (sessionData) {
        c.set('sessionData', sessionData)
      }
    }

    await next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Continue without authentication on error
    await next()
  }
}