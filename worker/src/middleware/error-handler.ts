import { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { ErrorHandler, Logger, generateRequestId } from '../utils';
import type { Bindings } from '../types';

/**
 * Error handling middleware for Hono
 * 
 * This middleware:
 * 1. Adds a request ID to each request
 * 2. Creates a logger instance for the request
 * 3. Creates an error handler instance for the request
 * 4. Catches and handles any errors thrown during request processing
 * 5. Logs request completion with timing information
 */
export async function errorHandlerMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  // Generate a unique request ID
  const requestId = generateRequestId();
  c.set('requestId', requestId);
  
  // Create logger and error handler instances
  const logger = new Logger(c.env, requestId);
  const errorHandler = new ErrorHandler(c.env);
  
  // Add to context
  c.set('logger', logger);
  c.set('errorHandler', errorHandler);
  
  // Set request context in logger
  logger.setContext({
    path: c.req.path,
    method: c.req.method
  });
  
  // Log request start
  logger.info('Request started', {
    url: c.req.url,
    headers: Object.fromEntries(c.req.raw.headers)
  });
  
  // Record start time
  const startTime = Date.now();
  
  try {
    // Process the request
    await next();
  } catch (error) {
    // Handle any uncaught errors
    const apiError = errorHandler.handleUnknownError(error, {
      path: c.req.path,
      method: c.req.method,
      requestId
    });
    
    // Log the error
    logger.error('Unhandled error in request', error, {
      statusCode: apiError.statusCode
    });
    
    // Return error response
    return c.json({
      success: false,
      error: apiError.error,
      code: apiError.code,
      requestId
    }, apiError.statusCode);
  } finally {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Log request completion
    logger.logRequest(c.res.status || 200, duration, {
      responseSize: c.res.headers.get('content-length')
    });
  }
}