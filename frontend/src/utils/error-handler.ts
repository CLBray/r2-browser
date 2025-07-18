import type { ApiError } from '../types';

/**
 * Error categories for better error handling and reporting
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  FILE_OPERATION = 'file_operation',
  STORAGE = 'storage',
  RATE_LIMIT = 'rate_limit',
  INTERNAL = 'internal',
  UNKNOWN = 'unknown'
}

/**
 * Error codes for specific error scenarios
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'invalid_credentials',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  SESSION_NOT_FOUND = 'session_not_found',
  
  // Authorization errors
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  
  // Validation errors
  INVALID_REQUEST = 'invalid_request',
  MISSING_PARAMETER = 'missing_parameter',
  INVALID_PARAMETER = 'invalid_parameter',
  
  // Network errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  CONNECTION_CLOSED = 'connection_closed',
  
  // File operation errors
  FILE_NOT_FOUND = 'file_not_found',
  FILE_TOO_LARGE = 'file_too_large',
  UPLOAD_FAILED = 'upload_failed',
  DOWNLOAD_FAILED = 'download_failed',
  DELETE_FAILED = 'delete_failed',
  RENAME_FAILED = 'rename_failed',
  
  // Storage errors
  STORAGE_FULL = 'storage_full',
  BUCKET_NOT_FOUND = 'bucket_not_found',
  OBJECT_LOCKED = 'object_locked',
  
  // Rate limit errors
  RATE_LIMITED = 'rate_limited',
  TOO_MANY_REQUESTS = 'too_many_requests',
  
  // Internal errors
  INTERNAL_ERROR = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  
  // Unknown errors
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Maps error codes to whether they are retryable
 */
const RETRYABLE_ERRORS: Record<ErrorCode, boolean> = {
  // Authentication errors - not retryable, require user action
  [ErrorCode.INVALID_CREDENTIALS]: false,
  [ErrorCode.TOKEN_EXPIRED]: false,
  [ErrorCode.TOKEN_INVALID]: false,
  [ErrorCode.SESSION_NOT_FOUND]: false,
  
  // Authorization errors - not retryable, require user action
  [ErrorCode.UNAUTHORIZED]: false,
  [ErrorCode.FORBIDDEN]: false,
  
  // Validation errors - not retryable, require code changes
  [ErrorCode.INVALID_REQUEST]: false,
  [ErrorCode.MISSING_PARAMETER]: false,
  [ErrorCode.INVALID_PARAMETER]: false,
  
  // Network errors - retryable
  [ErrorCode.NETWORK_ERROR]: true,
  [ErrorCode.TIMEOUT]: true,
  [ErrorCode.CONNECTION_CLOSED]: true,
  
  // File operation errors - some retryable
  [ErrorCode.FILE_NOT_FOUND]: false,
  [ErrorCode.FILE_TOO_LARGE]: false,
  [ErrorCode.UPLOAD_FAILED]: true,
  [ErrorCode.DOWNLOAD_FAILED]: true,
  [ErrorCode.DELETE_FAILED]: true,
  [ErrorCode.RENAME_FAILED]: true,
  
  // Storage errors - some retryable
  [ErrorCode.STORAGE_FULL]: false,
  [ErrorCode.BUCKET_NOT_FOUND]: false,
  [ErrorCode.OBJECT_LOCKED]: true,
  
  // Rate limit errors - retryable after delay
  [ErrorCode.RATE_LIMITED]: true,
  [ErrorCode.TOO_MANY_REQUESTS]: true,
  
  // Internal errors - retryable
  [ErrorCode.INTERNAL_ERROR]: true,
  [ErrorCode.SERVICE_UNAVAILABLE]: true,
  
  // Unknown errors - retryable
  [ErrorCode.UNKNOWN_ERROR]: true
};

/**
 * Maps error codes to user-friendly messages
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Authentication errors
  [ErrorCode.INVALID_CREDENTIALS]: 'The provided credentials are invalid. Please check your Account ID, Access Key, and Secret Key.',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.TOKEN_INVALID]: 'Your authentication token is invalid. Please log in again.',
  [ErrorCode.SESSION_NOT_FOUND]: 'Your session was not found. Please log in again.',
  
  // Authorization errors
  [ErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action. Please log in.',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource.',
  
  // Validation errors
  [ErrorCode.INVALID_REQUEST]: 'The request is invalid. Please check your input and try again.',
  [ErrorCode.MISSING_PARAMETER]: 'Required parameters are missing from your request.',
  [ErrorCode.INVALID_PARAMETER]: 'One or more parameters in your request are invalid.',
  
  // Network errors
  [ErrorCode.NETWORK_ERROR]: 'A network error occurred. Please check your connection and try again.',
  [ErrorCode.TIMEOUT]: 'The request timed out. Please try again later.',
  [ErrorCode.CONNECTION_CLOSED]: 'The connection was closed unexpectedly. Please try again.',
  
  // File operation errors
  [ErrorCode.FILE_NOT_FOUND]: 'The requested file was not found.',
  [ErrorCode.FILE_TOO_LARGE]: 'The file is too large to upload. Maximum file size is {maxSize}.',
  [ErrorCode.UPLOAD_FAILED]: 'Failed to upload the file. Please try again.',
  [ErrorCode.DOWNLOAD_FAILED]: 'Failed to download the file. Please try again.',
  [ErrorCode.DELETE_FAILED]: 'Failed to delete the file. Please try again.',
  [ErrorCode.RENAME_FAILED]: 'Failed to rename the file. Please try again.',
  
  // Storage errors
  [ErrorCode.STORAGE_FULL]: 'Your storage is full. Please delete some files and try again.',
  [ErrorCode.BUCKET_NOT_FOUND]: 'The specified bucket was not found. Please check your bucket name.',
  [ErrorCode.OBJECT_LOCKED]: 'The file is currently locked. Please try again later.',
  
  // Rate limit errors
  [ErrorCode.RATE_LIMITED]: 'You have exceeded the rate limit. Please try again in a few minutes.',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please slow down and try again later.',
  
  // Internal errors
  [ErrorCode.INTERNAL_ERROR]: 'An internal server error occurred. Our team has been notified.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is currently unavailable. Please try again later.',
  
  // Unknown errors
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again later.',
  
  // Generic fallback
  'default': 'An error occurred. Please try again later.'
};

/**
 * ErrorHandler class for frontend error handling
 */
export class ErrorHandler {
  /**
   * Parses an API error response
   */
  static parseApiError(error: unknown): ApiError {
    if (error instanceof Error) {
      return {
        error: error.message,
        code: ErrorCode.UNKNOWN_ERROR
      };
    }
    
    if (typeof error === 'string') {
      return {
        error: error,
        code: ErrorCode.UNKNOWN_ERROR
      };
    }
    
    if (typeof error === 'object' && error !== null) {
      const apiError = error as any;
      return {
        error: apiError.error || apiError.message || 'Unknown error',
        code: apiError.code || ErrorCode.UNKNOWN_ERROR
      };
    }
    
    return {
      error: 'Unknown error',
      code: ErrorCode.UNKNOWN_ERROR
    };
  }
  
  /**
   * Gets a user-friendly error message
   */
  static getUserFriendlyMessage(error: ApiError | string, params: Record<string, string> = {}): string {
    let code: string;
    let message: string;
    
    if (typeof error === 'string') {
      code = ErrorCode.UNKNOWN_ERROR;
      message = error;
    } else {
      code = error.code || ErrorCode.UNKNOWN_ERROR;
      message = error.error;
    }
    
    // Get user-friendly message from mapping or use the original message
    const friendlyMessage = USER_FRIENDLY_MESSAGES[code] || message || USER_FRIENDLY_MESSAGES.default;
    
    // Replace placeholders in the message
    return friendlyMessage.replace(/\{(\w+)\}/g, (_, key) => params[key] || `{${key}}`);
  }
  
  /**
   * Determines if an error is retryable
   */
  static isRetryable(error: ApiError | ErrorCode): boolean {
    if (typeof error === 'string') {
      return RETRYABLE_ERRORS[error as ErrorCode] || false;
    }
    
    const code = error.code as ErrorCode;
    return RETRYABLE_ERRORS[code] || false;
  }
  
  /**
   * Logs an error to the console and optionally to an error tracking service
   */
  static logError(error: ApiError | Error | unknown, context: Record<string, any> = {}): void {
    const parsedError = error instanceof Error ? { error: error.message, stack: error.stack } : this.parseApiError(error);
    
    // Log to console
    console.error('Error:', parsedError, context);
    
    // Here you could add integration with error tracking services like Sentry
    // if (typeof window !== 'undefined' && window.errorTracker) {
    //   window.errorTracker.captureException(error, { extra: { ...context, ...parsedError } });
    // }
  }
  
  /**
   * Implements exponential backoff for retrying operations
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 10000,
    shouldRetry: (error: unknown) => boolean = () => true
  ): Promise<T> {
    let lastError: Error | unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!shouldRetry(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff and jitter
          const delay = Math.min(
            maxDelayMs,
            baseDelayMs * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4)
          );
          
          console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}