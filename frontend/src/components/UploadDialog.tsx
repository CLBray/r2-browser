import React, { useState, useRef, useEffect } from 'react';
import { UploadZone } from './UploadZone';
import { UploadProgressItem } from './UploadProgressItem';
import { UploadManager } from './UploadManager';
import { performanceMonitor } from '../utils/performance-monitor';
import type { UploadTask, UploadManagerState } from '../types';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  currentPath,
  onUploadComplete
}) => {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        // Only close if not uploading
        if (!isUploading) {
          onClose();
        } else {
          // Show warning if uploads are in progress
          const confirmClose = window.confirm('Uploads are in progress. Are you sure you want to close the dialog?');
          if (confirmClose) {
            onClose();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isUploading]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Only close if not uploading
        if (!isUploading) {
          onClose();
        } else {
          // Show warning if uploads are in progress
          const confirmClose = window.confirm('Uploads are in progress. Are you sure you want to close the dialog?');
          if (confirmClose) {
            onClose();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, isUploading]);

  // Files to be uploaded
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  // Handle file upload start
  const handleUploadStart = (files: File[]) => {
    // Track upload start in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_dialog_files_added',
      0,
      true,
      {
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        path: currentPath
      }
    );

    // Set files to be uploaded
    setFilesToUpload(files);
    setIsUploading(true);
  };

  // Handle upload progress updates from UploadManager
  const handleUploadProgress = (state: UploadManagerState) => {
    // Convert tasks from record to array for compatibility with existing code
    const taskArray = Object.values(state.tasks);
    setUploadTasks(taskArray);
    
    // Update uploading state based on overall status
    if (state.status === 'completed') {
      setIsUploading(false);
    } else if (state.status === 'uploading') {
      setIsUploading(true);
    }
  };

  // Handle upload completion
  const handleUploadComplete = () => {
    setIsUploading(false);
    onUploadComplete();
    // Clear files to upload
    setFilesToUpload([]);
  };

  // Handle upload errors
  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    // We don't need to set isUploading to false here
    // as the UploadManager will report the overall status
  };

  // These functions will be handled by the UploadManager component
  // We keep them as stubs for now to maintain compatibility with UploadProgressItem
  const handleCancelTask = (taskId: string) => {
    // This will be handled by UploadManager
    // Track cancel in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_task_canceled',
      0,
      true,
      { taskId }
    );
  };

  const handleRetryTask = (taskId: string) => {
    // This will be handled by UploadManager
    // Track retry in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_task_retry',
      0,
      true,
      { taskId }
    );
  };

  // Calculate overall progress
  const overallProgress = uploadTasks.length > 0
    ? uploadTasks.reduce((sum, task) => sum + task.progress, 0) / uploadTasks.length
    : 0;

  // Count completed, error, and total files
  const completedFiles = uploadTasks.filter(t => t.status === 'completed').length;
  const errorFiles = uploadTasks.filter(t => t.status === 'error').length;
  const totalFiles = uploadTasks.length;

  // Calculate total bytes and uploaded bytes
  const totalBytes = uploadTasks.reduce((sum, task) => sum + task.file.size, 0);
  const uploadedBytes = uploadTasks.reduce((sum, task) => sum + task.bytesUploaded, 0);

  // Calculate overall upload speed
  const overallUploadSpeed = uploadTasks
    .filter(t => t.status === 'uploading')
    .reduce((sum, task) => sum + task.uploadSpeed, 0);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Format speed to human-readable format
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  // Estimate time remaining
  const estimateTimeRemaining = (): string => {
    if (overallUploadSpeed === 0 || uploadedBytes === totalBytes) return '';
    
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingSeconds = remainingBytes / overallUploadSpeed;
    
    if (remainingSeconds < 60) {
      return `${Math.ceil(remainingSeconds)} seconds left`;
    } else if (remainingSeconds < 3600) {
      return `${Math.ceil(remainingSeconds / 60)} minutes left`;
    } else {
      return `${Math.floor(remainingSeconds / 3600)}h ${Math.ceil((remainingSeconds % 3600) / 60)}m left`;
    }
  };

  // Handle cancel all uploads
  const handleCancelAll = () => {
    if (window.confirm('Are you sure you want to cancel all uploads?')) {
      // This will be handled by UploadManager
      // We'll just clear the files to upload
      setFilesToUpload([]);
      
      // Track cancel all in performance monitoring
      performanceMonitor.trackUserInteraction(
        'upload_cancel_all',
        0,
        true,
        { taskCount: uploadTasks.length }
      );
    }
  };

  // If dialog is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        data-testid="upload-dialog"
      >
        {/* Dialog header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Upload Files to {currentPath || 'Root Directory'}
          </h2>
          <button
            onClick={() => {
              if (!isUploading || window.confirm('Uploads are in progress. Are you sure you want to close the dialog?')) {
                onClose();
              }
            }}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Upload zone */}
        <div className="p-6 border-b border-gray-200">
          <UploadZone
            currentPath={currentPath}
            onUploadStart={handleUploadStart}
            onUploadComplete={onUploadComplete}
            disabled={false}
          />
        </div>

        {/* Upload Manager */}
        {filesToUpload.length > 0 && (
          <UploadManager
            files={filesToUpload}
            currentPath={currentPath}
            onComplete={handleUploadComplete}
            onError={handleUploadError}
            onProgress={handleUploadProgress}
          />
        )}
        
        {/* Upload tasks list */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Uploads {completedFiles > 0 ? `(${completedFiles} of ${totalFiles} completed)` : ''}
          </h3>

          {uploadTasks.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No files selected for upload
            </div>
          ) : (
            <div className="space-y-3">
              {uploadTasks.map(task => (
                <UploadProgressItem
                  key={task.id}
                  task={task}
                  onCancel={() => handleCancelTask(task.id)}
                  onRetry={() => handleRetryTask(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with overall progress */}
        {uploadTasks.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress: {Math.round(overallProgress)}%</span>
                <span>
                  {formatBytes(uploadedBytes)} of {formatBytes(totalBytes)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            
            {isUploading && (
              <div className="text-sm text-gray-600 mb-3">
                {formatSpeed(overallUploadSpeed)} - {estimateTimeRemaining()}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleCancelAll}
                disabled={!isUploading}
                className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium
                  ${isUploading 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-gray-400 cursor-not-allowed'}`}
              >
                Cancel All
              </button>
              
              <button
                onClick={onClose}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium
                  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isUploading ? 'Close When Done' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};