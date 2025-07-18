// Core data types for the R2 File Explorer application

export interface FileObject {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  type: 'file' | 'folder';
  mimeType?: string;
}

export interface FolderObject {
  prefix: string;
  name: string;
  type: 'folder';
}

export interface DirectoryListing {
  objects: FileObject[];
  folders: FolderObject[];
  currentPath: string;
  hasMore: boolean;
  continuationToken?: string;
}

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface AuthSession {
  token: string;
  expiresAt: number;
  bucketName: string;
  userId?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  category?: string;
  details?: any;
  retryable?: boolean;
  httpStatus?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadTask {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}