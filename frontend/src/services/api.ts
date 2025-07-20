// API client service for communicating with the Cloudflare Worker backend

import type { R2Credentials, AuthSession, DirectoryListing, ApiError } from '../types';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';
import { performanceMonitor } from '../utils/performance-monitor';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }
  
  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers if they exist
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // Add request ID for tracing
    const requestId = this.generateRequestId();
    headers['X-Request-ID'] = requestId;
    
    // Track request start time for performance monitoring
    const startTime = performance.now();
    const method = options.method || 'GET';

    try {
      // Use retry logic for network requests
      return await ErrorHandler.withRetry(
        async () => {
          const response = await fetch(url, {
            ...options,
            headers,
          });
          
          // Calculate request duration
          const duration = performance.now() - startTime;
          
          // Track API request in performance monitoring
          performanceMonitor.trackApiRequest(
            endpoint,
            method,
            duration,
            response.status,
            response.ok,
            { requestId }
          );

          if (!response.ok) {
            // Try to parse error response
            const errorData: ApiError = await response.json().catch(() => ({
              error: `HTTP error ${response.status}: ${response.statusText}`,
              code: ErrorCode.NETWORK_ERROR,
            }));
            
            // Enhance error with HTTP status
            const enhancedError: ApiError = {
              ...errorData,
              code: errorData.code || this.mapHttpStatusToErrorCode(response.status),
              httpStatus: response.status
            };
            
            // Log the error
            ErrorHandler.logError(enhancedError, {
              url,
              method,
              status: response.status,
              requestId
            });
            
            // Track error in performance monitoring
            performanceMonitor.trackError(
              'api_error',
              enhancedError.error,
              `${method} ${endpoint}`,
              undefined,
              {
                status: response.status,
                code: enhancedError.code,
                requestId
              }
            );
            
            throw enhancedError;
          }

          return response.json();
        },
        3, // Max retries
        1000, // Base delay
        10000, // Max delay
        (error) => {
          // Only retry network errors and server errors (5xx)
          const apiError = ErrorHandler.parseApiError(error);
          return ErrorHandler.isRetryable(apiError);
        }
      );
    } catch (error) {
      // Calculate request duration even for failed requests
      const duration = performance.now() - startTime;
      
      // Convert to ApiError
      const apiError = ErrorHandler.parseApiError(error);
      
      // Track failed request in performance monitoring
      performanceMonitor.trackApiRequest(
        endpoint,
        method,
        duration,
        apiError.httpStatus || 0,
        false,
        { 
          requestId,
          error: apiError.error,
          code: apiError.code
        }
      );
      
      throw apiError;
    }
  }
  
  /**
   * Maps HTTP status codes to error codes
   */
  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.INVALID_REQUEST;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.FORBIDDEN;
      case 404:
        return ErrorCode.FILE_NOT_FOUND;
      case 413:
        return ErrorCode.FILE_TOO_LARGE;
      case 429:
        return ErrorCode.RATE_LIMITED;
      case 500:
        return ErrorCode.INTERNAL_ERROR;
      case 503:
        return ErrorCode.SERVICE_UNAVAILABLE;
      case 504:
        return ErrorCode.TIMEOUT;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.UNKNOWN_ERROR;
    }
  }
  
  /**
   * Generates a random request ID for tracing
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Authentication endpoints
  async login(credentials: R2Credentials): Promise<ApiResponse<AuthSession>> {
    return this.request<ApiResponse<AuthSession>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verify(): Promise<{ valid: boolean; bucketName?: string; userId?: string; expiresAt?: number }> {
    return this.request<{ valid: boolean; bucketName?: string; userId?: string; expiresAt?: number }>('/api/auth/verify', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<{ token: string; expiresAt: number }> {
    return this.request<{ token: string; expiresAt: number }>('/api/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  }

  // File operation endpoints
  async listFiles(path: string = '', prefix: string = ''): Promise<DirectoryListing> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (prefix) params.append('prefix', prefix);
    
    return this.request<DirectoryListing>(`/api/files?${params.toString()}`);
  }

  async uploadFiles(files: File[], path: string = ''): Promise<{ uploaded: string[]; errors: string[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (path) formData.append('path', path);

    try {
      // Use retry logic for uploads
      return await ErrorHandler.withRetry(
        async () => {
          const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
            method: 'POST',
            headers: {
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
              'X-Request-ID': this.generateRequestId()
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData: ApiError = await response.json().catch(() => ({
              error: `Upload failed with status ${response.status}`,
              code: ErrorCode.UPLOAD_FAILED,
            }));
            
            // Enhance error with HTTP status
            const enhancedError: ApiError = {
              ...errorData,
              code: errorData.code || ErrorCode.UPLOAD_FAILED,
              httpStatus: response.status
            };
            
            // Log the error
            ErrorHandler.logError(enhancedError, {
              path,
              fileCount: files.length,
              totalSize: files.reduce((sum, file) => sum + file.size, 0)
            });
            
            throw enhancedError;
          }

          return response.json();
        },
        3, // Max retries
        2000, // Base delay (longer for uploads)
        15000, // Max delay
        (error) => {
          // Only retry network errors and server errors (5xx)
          const apiError = ErrorHandler.parseApiError(error);
          return ErrorHandler.isRetryable(apiError);
        }
      );
    } catch (error) {
      // Convert to ApiError and throw
      const apiError = ErrorHandler.parseApiError(error);
      throw apiError;
    }
  }

  async downloadFile(key: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob> {
    try {
      // Use retry logic for downloads
      return await ErrorHandler.withRetry(
        async () => {
          const response = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(key)}`, {
            headers: {
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
              'X-Request-ID': this.generateRequestId()
            },
          });

          if (!response.ok) {
            const errorData: ApiError = await response.json().catch(() => ({
              error: `Download failed with status ${response.status}`,
              code: ErrorCode.DOWNLOAD_FAILED,
            }));
            
            // Enhance error with HTTP status
            const enhancedError: ApiError = {
              ...errorData,
              code: errorData.code || ErrorCode.DOWNLOAD_FAILED,
              httpStatus: response.status
            };
            
            // Log the error
            ErrorHandler.logError(enhancedError, { key });
            
            throw enhancedError;
          }

          // Handle progress tracking if callback provided
          if (onProgress && response.body) {
            const contentLength = response.headers.get('Content-Length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            
            if (total > 0) {
              const reader = response.body.getReader();
              const chunks: Uint8Array[] = [];
              let loaded = 0;

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) break;
                  
                  chunks.push(value);
                  loaded += value.length;
                  onProgress(loaded, total);
                }
                
                // Combine all chunks into a single Uint8Array
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                  result.set(chunk, offset);
                  offset += chunk.length;
                }
                
                return new Blob([result]);
              } finally {
                reader.releaseLock();
              }
            }
          }

          return response.blob();
        },
        3, // Max retries
        1000, // Base delay
        10000, // Max delay
        (error) => {
          // Only retry network errors and server errors (5xx)
          const apiError = ErrorHandler.parseApiError(error);
          return ErrorHandler.isRetryable(apiError);
        }
      );
    } catch (error) {
      // Convert to ApiError and throw
      const apiError = ErrorHandler.parseApiError(error);
      throw apiError;
    }
  }

  async downloadFileWithRange(key: string, start: number, end?: number): Promise<{ blob: Blob; contentRange: string | null }> {
    try {
      const rangeHeader = end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`;
      
      return await ErrorHandler.withRetry(
        async () => {
          const response = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(key)}`, {
            headers: {
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
              'Range': rangeHeader,
              'X-Request-ID': this.generateRequestId()
            },
          });

          if (!response.ok && response.status !== 206) {
            const errorData: ApiError = await response.json().catch(() => ({
              error: `Range download failed with status ${response.status}`,
              code: ErrorCode.DOWNLOAD_FAILED,
            }));
            
            // Enhance error with HTTP status
            const enhancedError: ApiError = {
              ...errorData,
              code: errorData.code || ErrorCode.DOWNLOAD_FAILED,
              httpStatus: response.status
            };
            
            // Log the error
            ErrorHandler.logError(enhancedError, { key, range: rangeHeader });
            
            throw enhancedError;
          }

          const blob = await response.blob();
          const contentRange = response.headers.get('Content-Range');
          
          return { blob, contentRange };
        },
        3, // Max retries
        1000, // Base delay
        10000, // Max delay
        (error) => {
          // Only retry network errors and server errors (5xx)
          const apiError = ErrorHandler.parseApiError(error);
          return ErrorHandler.isRetryable(apiError);
        }
      );
    } catch (error) {
      // Convert to ApiError and throw
      const apiError = ErrorHandler.parseApiError(error);
      throw apiError;
    }
  }

  async deleteFile(key: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/files?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  async renameFile(oldKey: string, newKey: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/files/rename', {
      method: 'PUT',
      body: JSON.stringify({ oldKey, newKey }),
    });
  }

  async createFolder(path: string, name: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/files/folder', {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    });
  }
}

export const apiClient = new ApiClient();