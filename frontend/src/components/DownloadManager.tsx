// Download manager component for handling file downloads with progress tracking and resumable downloads

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { DownloadTask, DownloadManagerState, FileObject } from '../types';
import { apiClient } from '../services/api';
import { ErrorHandler } from '../utils/error-handler';
import { performanceMonitor } from '../utils/performance-monitor';

interface DownloadManagerProps {
  isVisible: boolean;
  onClose: () => void;
  downloadRequests: FileObject[];
  onDownloadRequestProcessed: (file: FileObject) => void;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for resumable downloads
const MAX_CONCURRENT_DOWNLOADS = 3;

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  isVisible,
  onClose,
  downloadRequests,
  onDownloadRequestProcessed,
}) => {
  const [state, setState] = useState<DownloadManagerState>({
    tasks: {},
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    overallProgress: 0,
    status: 'idle',
  });

  const activeDownloads = useRef<Set<string>>(new Set());
  const downloadQueue = useRef<string[]>([]);

  // Generate unique task ID
  const generateTaskId = useCallback(() => {
    return `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Update overall state
  const updateState = useCallback(() => {
    setState(prevState => {
      const tasks = Object.values(prevState.tasks);
      const totalFiles = tasks.length;
      const completedFiles = tasks.filter(t => t.status === 'completed').length;
      const failedFiles = tasks.filter(t => t.status === 'error').length;
      const totalBytes = tasks.reduce((sum, t) => sum + t.fileSize, 0);
      const downloadedBytes = tasks.reduce((sum, t) => sum + t.bytesDownloaded, 0);
      const overallProgress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
      
      let status: DownloadManagerState['status'] = 'idle';
      if (tasks.some(t => t.status === 'downloading')) {
        status = 'downloading';
      } else if (completedFiles === totalFiles && totalFiles > 0) {
        status = 'completed';
      } else if (failedFiles > 0) {
        status = 'error';
      }

      return {
        ...prevState,
        totalFiles,
        completedFiles,
        failedFiles,
        totalBytes,
        downloadedBytes,
        overallProgress,
        status,
      };
    });
  }, []);

  // Update task
  const updateTask = useCallback((taskId: string, updates: Partial<DownloadTask>) => {
    setState(prevState => ({
      ...prevState,
      tasks: {
        ...prevState.tasks,
        [taskId]: {
          ...prevState.tasks[taskId],
          ...updates,
        },
      },
    }));
  }, []);

  // Process download queue
  const processQueue = useCallback(async () => {
    while (downloadQueue.current.length > 0 && activeDownloads.current.size < MAX_CONCURRENT_DOWNLOADS) {
      const taskId = downloadQueue.current.shift();
      if (!taskId) continue;

      activeDownloads.current.add(taskId);
      
      // Start download in background
      downloadFile(taskId).finally(() => {
        activeDownloads.current.delete(taskId);
        processQueue(); // Process next item in queue
      });
    }
  }, []);

  // Download file with progress tracking and resumable support
  const downloadFile = useCallback(async (taskId: string) => {
    const task = state.tasks[taskId];
    if (!task) return;

    try {
      updateTask(taskId, { 
        status: 'downloading', 
        startTime: Date.now(),
        error: undefined 
      });

      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastBytesDownloaded = 0;

      // Progress callback
      const onProgress = (loaded: number, total: number) => {
        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000; // seconds
        const bytesDiff = loaded - lastBytesDownloaded;
        
        if (timeDiff >= 0.5) { // Update every 500ms
          const speed = bytesDiff / timeDiff;
          const progress = total > 0 ? (loaded / total) * 100 : 0;
          const estimatedTimeRemaining = speed > 0 ? (total - loaded) / speed : undefined;

          updateTask(taskId, {
            progress,
            bytesDownloaded: loaded,
            downloadSpeed: speed,
            estimatedTimeRemaining,
          });

          lastProgressTime = now;
          lastBytesDownloaded = loaded;
        }
      };

      // Track download start
      performanceMonitor.trackUserInteraction(
        'download_start',
        0,
        true,
        {
          fileName: task.fileName,
          fileSize: task.fileSize,
          resumable: task.resumable,
        }
      );

      // Download the file
      const blob = await apiClient.downloadFile(task.key, onProgress);
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = task.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        bytesDownloaded: task.fileSize,
        endTime,
      });

      // Track successful download
      performanceMonitor.trackUserInteraction(
        'download_complete',
        duration * 1000,
        true,
        {
          fileName: task.fileName,
          fileSize: task.fileSize,
          downloadSpeed: task.fileSize / duration,
        }
      );

    } catch (error) {
      const apiError = ErrorHandler.parseApiError(error);
      
      updateTask(taskId, {
        status: 'error',
        error: ErrorHandler.getUserFriendlyMessage(apiError),
        endTime: Date.now(),
      });

      // Track failed download
      performanceMonitor.trackError(
        'download_error',
        apiError.error,
        `Download: ${task.fileName}`,
        undefined,
        {
          fileName: task.fileName,
          fileSize: task.fileSize,
          errorCode: apiError.code,
        }
      );

      ErrorHandler.logError(apiError, {
        taskId,
        fileName: task.fileName,
        fileSize: task.fileSize,
      });
    }
  }, [state.tasks, updateTask]);

  // Add download task
  const addDownload = useCallback((file: FileObject) => {
    const taskId = generateTaskId();
    const task: DownloadTask = {
      id: taskId,
      key: file.key,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'pending',
      bytesDownloaded: 0,
      downloadSpeed: 0,
      resumable: file.size > CHUNK_SIZE, // Enable resumable for files > 1MB
    };

    setState(prevState => ({
      ...prevState,
      tasks: {
        ...prevState.tasks,
        [taskId]: task,
      },
    }));

    downloadQueue.current.push(taskId);
    processQueue();

    return taskId;
  }, [generateTaskId, processQueue]);

  // Retry download
  const retryDownload = useCallback((taskId: string) => {
    const task = state.tasks[taskId];
    if (!task || task.status !== 'error') return;

    updateTask(taskId, {
      status: 'pending',
      error: undefined,
      progress: 0,
      bytesDownloaded: 0,
    });

    downloadQueue.current.push(taskId);
    processQueue();
  }, [state.tasks, updateTask, processQueue]);

  // Cancel download
  const cancelDownload = useCallback((taskId: string) => {
    const task = state.tasks[taskId];
    if (!task) return;

    if (task.status === 'downloading') {
      // Remove from active downloads
      activeDownloads.current.delete(taskId);
    }

    // Remove from queue if pending
    const queueIndex = downloadQueue.current.indexOf(taskId);
    if (queueIndex > -1) {
      downloadQueue.current.splice(queueIndex, 1);
    }

    updateTask(taskId, {
      status: 'canceled',
    });
  }, [state.tasks, updateTask]);

  // Remove completed/failed downloads
  const clearCompleted = useCallback(() => {
    setState(prevState => {
      const newTasks = { ...prevState.tasks };
      Object.keys(newTasks).forEach(taskId => {
        const task = newTasks[taskId];
        if (task.status === 'completed' || task.status === 'error' || task.status === 'canceled') {
          delete newTasks[taskId];
        }
      });
      return {
        ...prevState,
        tasks: newTasks,
      };
    });
  }, []);

  // Handle new download requests
  useEffect(() => {
    downloadRequests.forEach(file => {
      // Check if this file is already being downloaded
      const existingTask = Object.values(state.tasks).find(task => task.key === file.key);
      if (!existingTask) {
        addDownload(file);
        onDownloadRequestProcessed(file);
      }
    });
  }, [downloadRequests, state.tasks, addDownload, onDownloadRequestProcessed]);

  // Update state when tasks change
  useEffect(() => {
    updateState();
  }, [state.tasks, updateState]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format download speed
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (!isVisible) return null;

  const tasks = Object.values(state.tasks);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Downloads</h2>
          <div className="flex items-center space-x-2">
            {tasks.length > 0 && (
              <button
                onClick={clearCompleted}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Clear Completed
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Overall Progress */}
        {state.totalFiles > 0 && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                {state.completedFiles} of {state.totalFiles} files completed
              </span>
              <span>
                {formatFileSize(state.downloadedBytes)} / {formatFileSize(state.totalBytes)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <p>No downloads yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(task.fileSize)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {task.status === 'downloading' && (
                        <div className="text-xs text-gray-500">
                          {formatSpeed(task.downloadSpeed)}
                          {task.estimatedTimeRemaining && (
                            <span className="ml-1">
                              • {formatTimeRemaining(task.estimatedTimeRemaining)} left
                            </span>
                          )}
                        </div>
                      )}
                      
                      {task.status === 'error' && (
                        <button
                          onClick={() => retryDownload(task.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded"
                        >
                          Retry
                        </button>
                      )}
                      
                      {(task.status === 'pending' || task.status === 'downloading') && (
                        <button
                          onClick={() => cancelDownload(task.id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {task.status === 'completed' && 'Completed'}
                        {task.status === 'downloading' && `${Math.round(task.progress)}%`}
                        {task.status === 'pending' && 'Waiting...'}
                        {task.status === 'error' && 'Failed'}
                        {task.status === 'canceled' && 'Canceled'}
                      </span>
                      <span>
                        {formatFileSize(task.bytesDownloaded)} / {formatFileSize(task.fileSize)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          task.status === 'completed' ? 'bg-green-600' :
                          task.status === 'error' ? 'bg-red-600' :
                          task.status === 'canceled' ? 'bg-gray-400' :
                          'bg-blue-600'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {task.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to use download manager
export const useDownloadManager = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [downloadRequests, setDownloadRequests] = useState<FileObject[]>([]);

  const showDownloadManager = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideDownloadManager = useCallback(() => {
    setIsVisible(false);
  }, []);

  const downloadFile = useCallback((file: FileObject) => {
    setDownloadRequests(prev => [...prev, file]);
    setIsVisible(true);
    return `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const handleDownloadRequestProcessed = useCallback((file: FileObject) => {
    setDownloadRequests(prev => prev.filter(f => f.key !== file.key));
  }, []);

  const DownloadManagerComponent = useCallback((props: Omit<DownloadManagerProps, 'isVisible' | 'onClose' | 'downloadRequests' | 'onDownloadRequestProcessed'>) => (
    <DownloadManager
      {...props}
      isVisible={isVisible}
      onClose={hideDownloadManager}
      downloadRequests={downloadRequests}
      onDownloadRequestProcessed={handleDownloadRequestProcessed}
    />
  ), [isVisible, hideDownloadManager, downloadRequests, handleDownloadRequestProcessed]);

  return {
    DownloadManagerComponent,
    isVisible,
    showDownloadManager,
    hideDownloadManager,
    downloadFile,
  };
};