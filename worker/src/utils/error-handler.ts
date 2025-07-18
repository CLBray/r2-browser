import type { Bindings } from '../types';

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
 * Standard error structure for API responses
 */
export interface ApiError {
  error: string;
  code: string;
  category: ErrorCategory;
  details?: any;
  retryable: boolean;
  statusCode: number;
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
 * Maps error codes to their default HTTP status codes
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // Authentication errors
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.SESSION_NOT_FOUND]: 401,
  
  // Authorization errors
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  
  // Validation errors
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.MISSING_PARAMETER]: 400,
  [ErrorCode.INVALID_PARAMETER]: 400,
  
  // Network errors
  [ErrorCode.NETWORK_ERROR]: 500,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.CONNECTION_CLOSED]: 499,
  
  // File operation errors
  [ErrorCode.FILE_NOT_FOUND]: 404,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.UPLOAD_FAILED]: 500,
  [ErrorCode.DOWNLOAD_FAILED]: 500,
  [ErrorCode.DELETE_FAILED]: 500,
  [ErrorCode.RENAME_FAILED]: 500,
  
  // Storage errors
  [ErrorCode.STORAGE_FULL]: 507,
  [ErrorCode.BUCKET_NOT_FOUND]: 404,
  [ErrorCode.OBJECT_LOCKED]: 423,
  
  // Rate limit errors
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  
  // Internal errors
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  // Unknown errors
  [ErrorCode.UNKNOWN_ERROR]: 500
};

/**
 * Maps error codes to their categories
 */
const ERROR_CATEGORIES: Record<ErrorCode, ErrorCategory> = {
  // Authentication errors
  [ErrorCode.INVALID_CREDENTIALS]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.TOKEN_EXPIRED]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.TOKEN_INVALID]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.SESSION_NOT_FOUND]: ErrorCategory.AUTHENTICATION,
  
  // Authorization errors
  [ErrorCode.UNAUTHORIZED]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.FORBIDDEN]: ErrorCategory.AUTHORIZATION,
  
  // Validation errors
  [ErrorCode.INVALID_REQUEST]: ErrorCategory.VALIDATION,
  [ErrorCode.MISSING_PARAMETER]: ErrorCategory.VALIDATION,
  [ErrorCode.INVALID_PARAMETER]: ErrorCategory.VALIDATION,
  
  // Network errors
  [ErrorCode.NETWORK_ERROR]: ErrorCategory.NETWORK,
  [ErrorCode.TIMEOUT]: ErrorCategory.NETWORK,
  [ErrorCode.CONNECTION_CLOSED]: ErrorCategory.NETWORK,
  
  // File operation errors
  [ErrorCode.FILE_NOT_FOUND]: ErrorCategory.FILE_OPERATION,
  [ErrorCode.FILE_TOO_LARGE]: ErrorCategory.FILE_OPERATION,
  [ErrorCode.UPLOAD_FAILED]: ErrorCategory.FILE_OPERATION,
  [ErrorCode.DOWNLOAD_FAILED]: ErrorCategory.FILE_OPERATION,
  [ErrorCode.DELETE_FAILED]: ErrorCategory.FILE_OPERATION,
  [ErrorCode.RENAME_FAILED]: ErrorCategory.FILE_OPERATION,
  
  // Storage errors
  [ErrorCode.STORAGE_FULL]: ErrorCategory.STORAGE,
  [ErrorCode.BUCKET_NOT_FOUND]: ErrorCategory.STORAGE,
  [ErrorCode.OBJECT_LOCKED]: ErrorCategory.STORAGE,
  
  // Rate limit errors
  [ErrorCode.RATE_LIMITED]: ErrorCategory.RATE_LIMIT,
  [ErrorCode.TOO_MANY_REQUESTS]: ErrorCategory.RATE_LIMIT,
  
  // Internal errors
  [ErrorCode.INTERNAL_ERROR]: ErrorCategory.INTERNAL,
  [ErrorCode.SERVICE_UNAVAILABLE]: ErrorCategory.INTERNAL,
  
  // Unknown errors
  [ErrorCode.UNKNOWN_ERROR]: ErrorCategory.UNKNOWN
};

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
const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
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
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again later.'
};

/**
 * ErrorHandler class for creating and managing API errors
 */
export class ErrorHandler {
  private env: Bindings;
  
  constructor(env: Bindings) {
    this.env = env;
  }
  
  /**
   * Creates an API error object
   */
  createError(
    code: ErrorCode,
    message?: string,
    details?: any,
    statusCode?: number
  ): ApiError {
    const category = ERROR_CATEGORIES[code];
    const defaultStatusCode = ERROR_STATUS_CODES[code];
    const retryable = RETRYABLE_ERRORS[code];
    const userMessage = message || USER_FRIENDLY_MESSAGES[code];
    
    return {
      error: userMessage,
      code,
      category,
      details,
      retryable,
      statusCode: statusCode || defaultStatusCode
    };
  }
  
  /**
   * Logs an error to the console and analytics
   */
  logError(error: ApiError, context: Record<string, any> = {}): void {
    // Create structured log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error.error,
      code: error.code,
      category: error.category,
      statusCode: error.statusCode,
      retryable: error.retryable,
      context,
      details: error.details
    };
    
    // Log to console
    console.error('API Error:', JSON.stringify(logEntry));
    
    // Log to analytics if available
    if (this.env.ANALYTICS) {
      try {
        this.env.ANALYTICS.writeDataPoint({
          blobs: [error.code, error.category, error.error],
          doubles: [1, error.statusCode],
          indexes: [this.env.ENVIRONMENT]
        });
      } catch (analyticsError) {
        console.error('Failed to log error to analytics:', analyticsError);
      }
    }
  }
  
  /**
   * Handles an unknown error and converts it to an ApiError
   */
  handleUnknownError(error: unknown, context: Record<string, any> = {}): ApiError {
    let apiError: ApiError;
    
    if (error instanceof Error) {
      // Try to categorize known error types
      if (error.message.includes('not found') || error.message.includes('404')) {
        apiError = this.createError(ErrorCode.FILE_NOT_FOUND, error.message);
      } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
        apiError = this.createError(ErrorCode.TIMEOUT, error.message);
      } else if (error.message.includes('permission') || error.message.includes('access denied')) {
        apiError = this.createError(ErrorCode.FORBIDDEN, error.message);
      } else if (error.message.includes('too large') || error.message.includes('size limit')) {
        apiError = this.createError(ErrorCode.FILE_TOO_LARGE, error.message);
      } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        apiError = this.createError(ErrorCode.RATE_LIMITED, error.message);
      } else {
        // Default to internal error
        apiError = this.createError(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          { originalError: error.message, stack: error.stack }
        );
      }
    } else {
      // For non-Error objects
      apiError = this.createError(
        ErrorCode.UNKNOWN_ERROR,
        'An unknown error occurred',
        { originalError: String(error) }
      );
    }
    
    // Log the error
    this.logError(apiError, context);
    
    return apiError;
  }
  
  /**
   * Determines if an error is retryable
   */
  isRetryable(error: ApiError | ErrorCode): boolean {
    if (typeof error === 'string') {
      return RETRYABLE_ERRORS[error] || false;
    }
    return error.retryable;
  }
  
  /**
   * Gets a user-friendly message for an error
   */
  getUserFriendlyMessage(error: ApiError | ErrorCode, params: Record<string, string> = {}): string {
    let message: string;
    
    if (typeof error === 'string') {
      message = USER_FRIENDLY_MESSAGES[error];
    } else {
      message = error.error || USER_FRIENDLY_MESSAGES[error.code as ErrorCode];
    }
    
    // Replace placeholders in the message
    return message.replace(/\{(\w+)\}/g, (_, key) => params[key] || `{${key}}`);
  }
}