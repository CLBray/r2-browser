// Type definitions for the R2 File Explorer API

export interface Bindings {
  R2_BUCKET: R2Bucket
  KV_SESSIONS: KVNamespace
  ANALYTICS?: AnalyticsEngineDataset
  ASSETS: Fetcher
  JWT_SECRET: string
  CORS_ORIGINS: string
  JWT_EXPIRY_HOURS: string
  MAX_FILE_SIZE_MB: string
  ENVIRONMENT: string
}

export interface FileObject {
  key: string
  size: number
  lastModified: Date
  etag: string
}

export interface ListFilesResponse {
  success: boolean
  objects?: FileObject[]
  truncated?: boolean
  cursor?: string
  error?: string
}

export interface UploadResponse {
  success: boolean
  message?: string
  filename?: string
  size?: number
  error?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthCredentials {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export interface SessionData {
  userId: string
  credentials: AuthCredentials
  expiresAt: number
  createdAt: number
}

export interface JWTPayload {
  userId: string
  sessionId: string
  exp: number
  iat: number
}