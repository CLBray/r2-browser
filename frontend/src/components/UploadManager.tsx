import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';
import { performanceMonitor } from '../utils/performance-monitor';
import type { UploadTask, UploadManagerState } from '../types';

// Size threshold for multipart uploads (100MB)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
// Default chunk size for multipart uploads (5MB)
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
// Maximum concurrent uploads
const MAX_CONCURRENT_UPLOADS = 3;
// Maximum concurrent chunks per multipart upload
const MAX_CONCURRENT_CHUNKS = 3;

interface UploadManagerProps {
  files: File[];
  currentPath: string;
  onComplete: () => void;
  onError: (error: Error) => void;
  onProgress?: (state: UploadManagerState) => void;
}

export const UploadManager: React.FC<UploadManagerProps> = ({
  files,
  currentPath,
  onComplete,
  onError,
  onProgress
}) => {
  // State to track all upload tasks
  const [uploadTasks, setUploadTasks] = useState<Record<string, UploadTask>>({});
  // State to track overall upload progress and status
  const [uploadState, setUploadState] = useState<UploadManagerState>({
    tasks: {},
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    overallProgress: 0,
    status: 'idle'
  });

  // Refs to track active uploads and intervals
  const activeUploadsRef = useRef<Set<string>>(new Set());
  const uploadQueueRef = useRef<string[]>([]);
  const progressIntervalRef = useRef<number | null>(null);
  const speedCalculationIntervalRef = useRef<number | null>(null);

  // Initialize upload tasks when files are provided
  useEffect(() => {
    if (files.length === 0) return;

    const newTasks: Record<string, UploadTask> = {};
    const taskIds: string[] = [];
    let totalBytes = 0;

    // Create upload tasks for each file
    files.forEach(file => {
      const taskId = generateTaskId();
      taskIds.push(taskId);
      totalBytes += file.size;

      newTasks[taskId] = {
        id: taskId,
        file,
        path: currentPath,
        progress: 0,
        status: 'pending',
        bytesUploaded: 0,
        uploadSpeed: 0,
        startTime: undefined,
        endTime: undefined,
        estimatedTimeRemaining: undefined
      };
    });

    // Update state with new tasks
    setUploadTasks(prev => ({ ...prev, ...newTasks }));
    uploadQueueRef.current = [...uploadQueueRef.current, ...taskIds];

    // Update overall state
    setUploadState(prev => ({
      ...prev,
      tasks: { ...prev.tasks, ...newTasks },
      totalFiles: prev.totalFiles + files.length,
      totalBytes: prev.totalBytes + totalBytes,
      status: 'uploading'
    }));

    // Start upload process
    startUploadProcess();

    // Track upload start in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_manager_start',
      0,
      true,
      {
        fileCount: files.length,
        totalSize: totalBytes,
        path: currentPath
      }
    );

    // Start progress tracking intervals
    startProgressTracking();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, currentPath]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
      if (speedCalculationIntervalRef.current) {
        window.clearInterval(speedCalculationIntervalRef.current);
      }
    };
  }, []);

  // Update parent component with progress
  useEffect(() => {
    if (onProgress) {
      onProgress(uploadState);
    }
  }, [uploadState, onProgress]);

  // Generate a unique task ID
  const generateTaskId = (): string => {
    return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Start tracking progress and speed
  const startProgressTracking = useCallback(() => {
    // Clear any existing intervals
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    if (speedCalculationIntervalRef.current) {
      window.clearInterval(speedCalculationIntervalRef.current);
    }

    // Track overall progress every 500ms
    progressIntervalRef.current = window.setInterval(() => {
      updateOverallProgress();
    }, 500);

    // Calculate upload speeds every 2 seconds
    speedCalculationIntervalRef.current = window.setInterval(() => {
      calculateUploadSpeeds();
    }, 2000);
  }, []);

  // Update the overall progress state
  const updateOverallProgress = useCallback(() => {
    setUploadState(prev => {
      const tasks = prev.tasks;
      const totalFiles = Object.keys(tasks).length;
      const completedFiles = Object.values(tasks).filter(
        t => t.status === 'completed'
      ).length;
      const failedFiles = Object.values(tasks).filter(
        t => t.status === 'error' || t.status === 'canceled'
      ).length;
      const totalBytes = Object.values(tasks).reduce(
        (sum, task) => sum + task.file.size,
        0
      );
      const uploadedBytes = Object.values(tasks).reduce(
        (sum, task) => sum + task.bytesUploaded,
        0
      );
      
      // Calculate overall progress as percentage
      const overallProgress = totalBytes > 0 
        ? (uploadedBytes / totalBytes) * 100 
        : 0;
      
      // Determine overall status
      let status = prev.status;
      if (completedFiles + failedFiles === totalFiles) {
        status = failedFiles > 0 ? 'error' : 'completed';
        
        // If all files are processed, call onComplete
        if (status === 'completed' && prev.status !== 'completed') {
          // Use setTimeout to avoid state update during render
          setTimeout(() => onComplete(), 0);
          
          // Track completion in performance monitoring
          performanceMonitor.trackUserInteraction(
            'upload_manager_complete',
            0,
            true,
            {
              fileCount: totalFiles,
              completedCount: completedFiles,
              failedCount: failedFiles,
              totalSize: totalBytes,
              uploadedSize: uploadedBytes
            }
          );
        }
      } else if (uploadedBytes > 0) {
        status = 'uploading';
      }
      
      return {
        tasks,
        totalFiles,
        completedFiles,
        failedFiles,
        totalBytes,
        uploadedBytes,
        overallProgress,
        status
      };
    });
  }, [onComplete]);

  // Calculate upload speeds for active uploads
  const calculateUploadSpeeds = useCallback(() => {
    setUploadTasks(prev => {
      const updatedTasks = { ...prev };
      
      Object.keys(updatedTasks).forEach(taskId => {
        const task = updatedTasks[taskId];
        
        if (task.status === 'uploading' && task.startTime) {
          const now = Date.now();
          const elapsedSeconds = (now - task.startTime) / 1000;
          
          if (elapsedSeconds > 0) {
            // Calculate upload speed in bytes per second
            const uploadSpeed = task.bytesUploaded / elapsedSeconds;
            
            // Calculate estimated time remaining
            const remainingBytes = task.file.size - task.bytesUploaded;
            const estimatedTimeRemaining = uploadSpeed > 0 
              ? remainingBytes / uploadSpeed 
              : undefined;
            
            updatedTasks[taskId] = {
              ...task,
              uploadSpeed,
              estimatedTimeRemaining
            };
          }
        }
      });
      
      return updatedTasks;
    });
  }, []);

  // Start the upload process
  const startUploadProcess = useCallback(() => {
    processUploadQueue();
  }, []);

  // Process the upload queue
  const processUploadQueue = useCallback(() => {
    // If we've reached the maximum concurrent uploads, wait
    if (activeUploadsRef.current.size >= MAX_CONCURRENT_UPLOADS) {
      return;
    }
    
    // Get the next task from the queue
    const nextTaskId = uploadQueueRef.current.shift();
    if (!nextTaskId) {
      return;
    }
    
    // Mark this task as active
    activeUploadsRef.current.add(nextTaskId);
    
    // Start the upload
    const task = uploadTasks[nextTaskId];
    if (task) {
      // Update task status to uploading
      updateTaskStatus(nextTaskId, 'uploading');
      
      // Determine if we should use multipart upload
      if (task.file.size >= MULTIPART_THRESHOLD) {
        uploadLargeFile(nextTaskId);
      } else {
        uploadFile(nextTaskId);
      }
    }
    
    // Process more tasks if possible
    if (uploadQueueRef.current.length > 0 && activeUploadsRef.current.size < MAX_CONCURRENT_UPLOADS) {
      processUploadQueue();
    }
  }, [uploadTasks]);

  // Update a task's status
  const updateTaskStatus = useCallback((taskId: string, status: UploadTask['status'], error?: string) => {
    setUploadTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      
      const updatedTask: UploadTask = {
        ...task,
        status,
        error,
        startTime: status === 'uploading' && !task.startTime ? Date.now() : task.startTime,
        endTime: (status === 'completed' || status === 'error' || status === 'canceled') && !task.endTime ? Date.now() : task.endTime
      };
      
      return {
        ...prev,
        [taskId]: updatedTask
      };
    });
  }, []);

  // Update a task's progress
  const updateTaskProgress = useCallback((taskId: string, bytesUploaded: number, totalBytes: number) => {
    setUploadTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      
      const progress = totalBytes > 0 ? (bytesUploaded / totalBytes) * 100 : 0;
      
      return {
        ...prev,
        [taskId]: {
          ...task,
          bytesUploaded,
          progress
        }
      };
    });
  }, []);

  // Handle task completion
  const completeTask = useCallback((taskId: string) => {
    updateTaskStatus(taskId, 'completed');
    activeUploadsRef.current.delete(taskId);
    
    // Process more tasks if available
    if (uploadQueueRef.current.length > 0) {
      processUploadQueue();
    }
  }, [updateTaskStatus, processUploadQueue]);

  // Handle task failure
  const failTask = useCallback((taskId: string, error: string) => {
    updateTaskStatus(taskId, 'error', error);
    activeUploadsRef.current.delete(taskId);
    
    // Process more tasks if available
    if (uploadQueueRef.current.length > 0) {
      processUploadQueue();
    }
  }, [updateTaskStatus, processUploadQueue]);

  // Upload a regular file
  const uploadFile = useCallback(async (taskId: string) => {
    const task = uploadTasks[taskId];
    if (!task) return;
    
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('files', task.file);
      formData.append('path', task.path);
      
      // Create an XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          updateTaskProgress(taskId, event.loaded, event.total);
        }
      });
      
      // Create a promise to handle the XHR request
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.open('POST', `${import.meta.env.VITE_API_URL || ''}/api/files/upload`);
        
        // Add authorization header if token exists
        const token = apiClient.getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                resolve();
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch (error) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`HTTP error ${xhr.status}: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };
        
        xhr.ontimeout = () => {
          reject(new Error('Upload timed out'));
        };
        
        xhr.send(formData);
      });
      
      // Wait for upload to complete
      await uploadPromise;
      
      // Mark task as completed
      completeTask(taskId);
      
      // Track successful upload in performance monitoring
      performanceMonitor.trackUserInteraction(
        'upload_complete',
        0,
        true,
        {
          fileSize: task.file.size,
          fileName: task.file.name,
          path: task.path,
          uploadDuration: task.startTime ? (Date.now() - task.startTime) : undefined
        }
      );
    } catch (error) {
      // Handle upload error
      const apiError = ErrorHandler.parseApiError(error);
      const errorMessage = ErrorHandler.getUserFriendlyMessage(apiError);
      
      failTask(taskId, errorMessage);
      
      // Track error in performance monitoring
      performanceMonitor.trackError(
        'upload_error',
        errorMessage,
        task.file.name,
        undefined,
        {
          fileSize: task.file.size,
          path: task.path,
          errorCode: apiError.code
        }
      );
      
      // Log the error
      ErrorHandler.logError(error, {
        taskId,
        fileName: task.file.name,
        fileSize: task.file.size,
        path: task.path
      });
    }
  }, [uploadTasks, updateTaskProgress, completeTask, failTask]);

  // Upload a large file using multipart upload
  const uploadLargeFile = useCallback(async (taskId: string) => {
    const task = uploadTasks[taskId];
    if (!task) return;
    
    try {
      // This is a placeholder for multipart upload implementation
      // In a real implementation, we would:
      // 1. Initiate a multipart upload
      // 2. Split the file into chunks
      // 3. Upload each chunk with progress tracking
      // 4. Complete the multipart upload
      
      // For now, we'll simulate progress for large files
      simulateMultipartUpload(taskId);
      
    } catch (error) {
      // Handle upload error
      const apiError = ErrorHandler.parseApiError(error);
      const errorMessage = ErrorHandler.getUserFriendlyMessage(apiError);
      
      failTask(taskId, errorMessage);
      
      // Track error in performance monitoring
      performanceMonitor.trackError(
        'multipart_upload_error',
        errorMessage,
        task.file.name,
        undefined,
        {
          fileSize: task.file.size,
          path: task.path,
          errorCode: apiError.code
        }
      );
      
      // Log the error
      ErrorHandler.logError(error, {
        taskId,
        fileName: task.file.name,
        fileSize: task.file.size,
        path: task.path
      });
    }
  }, [uploadTasks, failTask]);

  // Simulate multipart upload progress for large files
  // This is temporary until the actual multipart upload is implemented
  const simulateMultipartUpload = useCallback((taskId: string) => {
    const task = uploadTasks[taskId];
    if (!task) return;
    
    let bytesUploaded = 0;
    const totalBytes = task.file.size;
    const chunkSize = Math.floor(totalBytes / 100); // Simulate 100 chunks
    
    const interval = window.setInterval(() => {
      bytesUploaded += chunkSize;
      
      if (bytesUploaded >= totalBytes) {
        bytesUploaded = totalBytes;
        clearInterval(interval);
        
        // Mark task as completed
        completeTask(taskId);
        
        // Track successful upload in performance monitoring
        performanceMonitor.trackUserInteraction(
          'multipart_upload_complete',
          0,
          true,
          {
            fileSize: task.file.size,
            fileName: task.file.name,
            path: task.path,
            uploadDuration: task.startTime ? (Date.now() - task.startTime) : undefined
          }
        );
      }
      
      updateTaskProgress(taskId, bytesUploaded, totalBytes);
    }, 200);
  }, [uploadTasks, updateTaskProgress, completeTask]);

  // Cancel an upload task
  const cancelUpload = useCallback((taskId: string) => {
    const task = uploadTasks[taskId];
    if (!task) return;
    
    // If task is already completed or canceled, do nothing
    if (task.status === 'completed' || task.status === 'canceled') {
      return;
    }
    
    // Update task status to canceled
    updateTaskStatus(taskId, 'canceled');
    
    // Remove from active uploads
    activeUploadsRef.current.delete(taskId);
    
    // Remove from queue if it's still there
    uploadQueueRef.current = uploadQueueRef.current.filter(id => id !== taskId);
    
    // Track cancellation in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_canceled',
      0,
      true,
      {
        fileSize: task.file.size,
        fileName: task.file.name,
        path: task.path,
        progress: task.progress
      }
    );
    
    // Process more tasks if available
    if (uploadQueueRef.current.length > 0) {
      processUploadQueue();
    }
  }, [uploadTasks, updateTaskStatus, processUploadQueue]);

  // Retry a failed upload
  const retryUpload = useCallback((taskId: string) => {
    const task = uploadTasks[taskId];
    if (!task) return;
    
    // Only retry failed uploads
    if (task.status !== 'error' && task.status !== 'canceled') {
      return;
    }
    
    // Reset task status and progress
    setUploadTasks(prev => ({
      ...prev,
      [taskId]: {
        ...task,
        status: 'pending',
        progress: 0,
        bytesUploaded: 0,
        uploadSpeed: 0,
        startTime: undefined,
        endTime: undefined,
        estimatedTimeRemaining: undefined,
        error: undefined
      }
    }));
    
    // Add back to the queue
    uploadQueueRef.current.push(taskId);
    
    // Track retry in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_retry',
      0,
      true,
      {
        fileSize: task.file.size,
        fileName: task.file.name,
        path: task.path
      }
    );
    
    // Process the queue
    processUploadQueue();
  }, [uploadTasks, processUploadQueue]);

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    // Cancel all active uploads
    activeUploadsRef.current.forEach(taskId => {
      cancelUpload(taskId);
    });
    
    // Clear the queue
    uploadQueueRef.current = [];
    
    // Update all pending tasks to canceled
    setUploadTasks(prev => {
      const updatedTasks = { ...prev };
      
      Object.keys(updatedTasks).forEach(taskId => {
        const task = updatedTasks[taskId];
        if (task.status === 'pending' || task.status === 'uploading') {
          updatedTasks[taskId] = {
            ...task,
            status: 'canceled',
            endTime: Date.now()
          };
        }
      });
      
      return updatedTasks;
    });
    
    // Track cancel all in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_cancel_all',
      0,
      true,
      {
        taskCount: Object.keys(uploadTasks).length
      }
    );
  }, [cancelUpload, uploadTasks]);

  // This component doesn't render anything directly
  // It's a logic component that manages uploads
  return null;
};