export * from './error-handler';
export * from './logger';

/**
 * Generates a random request ID for tracing
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Implements exponential backoff for retrying operations
 * 
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns The result of the operation
 * @throws The last error encountered if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
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

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Truncates a string to a maximum length
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitizes a file path to prevent path traversal attacks
 */
export function sanitizeFilePath(path: string): string {
  // Remove any path traversal sequences
  let sanitized = path.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
  
  // Ensure path starts with a forward slash if not empty
  if (sanitized && !sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }
  
  // Remove duplicate slashes
  sanitized = sanitized.replace(/\/+/g, '/');
  
  return sanitized;
}

/**
 * Validates a file name to ensure it's safe
 */
export function isValidFileName(fileName: string): boolean {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  if (invalidChars.test(fileName)) {
    return false;
  }
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reservedNames.test(fileName)) {
    return false;
  }
  
  // Check for empty name or only dots
  if (!fileName || fileName === '.' || fileName === '..') {
    return false;
  }
  
  return true;
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}