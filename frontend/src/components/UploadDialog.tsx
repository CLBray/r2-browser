import React, { useState, useRef, useEffect } from 'react';
import { UploadZone } from './UploadZone';
import { UploadProgressItem } from './UploadProgressItem';
import { performanceMonitor } from '../utils/performance-monitor';
import type { UploadTask } from '../types';

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

  // Handle file upload start
  const handleUploadStart = (files: File[]) => {
    // Create upload tasks for each file
    const newTasks = files.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      path: currentPath,
      progress: 0,
      status: 'pending' as const,
      bytesUploaded: 0,
      uploadSpeed: 0
    }));

    // Add new tasks to the list
    setUploadTasks(prev => [...prev, ...newTasks]);
    setIsUploading(true);

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

    // In a real implementation, we would start the upload process here
    // For now, we'll just simulate progress updates
    simulateUploads(newTasks);
  };

  // Simulate upload progress for demonstration purposes
  // This would be replaced with actual upload logic in a later task
  const simulateUploads = (tasks: UploadTask[]) => {
    tasks.forEach(task => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Update task status to completed
          setUploadTasks(prev => 
            prev.map(t => 
              t.id === task.id 
                ? { 
                    ...t, 
                    progress: 100, 
                    status: 'completed', 
                    bytesUploaded: t.file.size,
                    uploadSpeed: 0
                  } 
                : t
            )
          );

          // Check if all tasks are complete
          setUploadTasks(prev => {
            const allComplete = prev.every(t => t.status === 'completed' || t.status === 'error');
            if (allComplete) {
              setIsUploading(false);
              onUploadComplete();
            }
            return prev;
          });
        } else {
          // Update task progress
          setUploadTasks(prev => 
            prev.map(t => 
              t.id === task.id 
                ? { 
                    ...t, 
                    progress, 
                    status: 'uploading',
                    bytesUploaded: Math.floor(t.file.size * (progress / 100)),
                    uploadSpeed: Math.floor(Math.random() * 1000000) // Random speed for simulation
                  } 
                : t
            )
          );
        }
      }, 500);
    });
  };

  // Handle task cancellation
  const handleCancelTask = (taskId: string) => {
    setUploadTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'canceled', progress: 0, uploadSpeed: 0 } 
          : t
      )
    );

    // Track cancel in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_task_canceled',
      0,
      true,
      { taskId }
    );
  };

  // Handle task retry
  const handleRetryTask = (taskId: string) => {
    const task = uploadTasks.find(t => t.id === taskId);
    if (task) {
      setUploadTasks(prev => 
        prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'pending', progress: 0, bytesUploaded: 0, uploadSpeed: 0 } 
            : t
        )
      );

      // Track retry in performance monitoring
      performanceMonitor.trackUserInteraction(
        'upload_task_retry',
        0,
        true,
        { taskId }
      );

      // Simulate upload for the retried task
      simulateUploads([{ ...task, status: 'pending', progress: 0, bytesUploaded: 0, uploadSpeed: 0 }]);
    }
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
      setUploadTasks(prev => 
        prev.map(t => 
          t.status === 'uploading' || t.status === 'pending'
            ? { ...t, status: 'canceled', progress: 0, uploadSpeed: 0 }
            : t
        )
      );
      setIsUploading(false);

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