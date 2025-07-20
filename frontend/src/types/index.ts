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

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface UploadTask {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'canceled';
  error?: string;
  uploadId?: string; // For multipart uploads
  parts?: UploadedPart[];
  startTime?: number;
  endTime?: number;
  bytesUploaded: number;
  uploadSpeed: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
}

export interface UploadManagerState {
  tasks: Record<string, UploadTask>;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
}

export interface UploadResponse {
  success: boolean;
  uploaded?: string[];
  errors?: Record<string, string>;
  message?: string;
}

export interface MultipartCreateResponse {
  success: boolean;
  uploadId?: string;
  key?: string;
  error?: string;
}

export interface MultipartUploadPartResponse {
  success: boolean;
  partNumber?: number;
  etag?: string;
  error?: string;
}

export interface MultipartCompleteResponse {
  success: boolean;
  message?: string;
  data?: { key: string };
  error?: string;
}

export interface DownloadTask {
  id: string;
  key: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'canceled' | 'paused';
  error?: string;
  startTime?: number;
  endTime?: number;
  bytesDownloaded: number;
  downloadSpeed: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  resumable: boolean;
  chunks?: DownloadChunk[];
}

export interface DownloadChunk {
  start: number;
  end: number;
  downloaded: boolean;
  data?: Blob;
}

export interface DownloadManagerState {
  tasks: Record<string, DownloadTask>;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalBytes: number;
  downloadedBytes: number;
  overallProgress: number;
  status: 'idle' | 'downloading' | 'completed' | 'error';
}