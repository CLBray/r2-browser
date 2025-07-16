// Utility functions for the R2 File Explorer API

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(sizeBytes: number, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return sizeBytes <= maxSizeBytes
}

/**
 * Extracts file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

/**
 * Generates a unique filename with timestamp
 */
export function generateUniqueFilename(originalName?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  
  if (originalName) {
    const extension = getFileExtension(originalName)
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    return `${baseName}-${timestamp}-${random}${extension ? '.' + extension : ''}`
  }
  
  return `upload-${timestamp}-${random}`
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Validates filename for R2 compatibility
 */
export function validateFilename(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename cannot be empty' }
  }
  
  if (filename.length > 1024) {
    return { valid: false, error: 'Filename too long (max 1024 characters)' }
  }
  
  // R2 object keys cannot contain certain characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/
  if (invalidChars.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' }
  }
  
  return { valid: true }
}

/**
 * Creates a standardized API error response
 */
export function createErrorResponse(message: string, code?: string) {
  return {
    success: false,
    error: message,
    ...(code && { code })
  }
}

/**
 * Creates a standardized API success response
 */
export function createSuccessResponse<T>(data?: T, message?: string) {
  return {
    success: true,
    ...(data && { data }),
    ...(message && { message })
  }
}