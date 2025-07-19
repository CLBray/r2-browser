import React from 'react';
import type { UploadTask } from '../types';

interface UploadProgressItemProps {
  task: UploadTask;
  onCancel: () => void;
  onRetry: () => void;
}

export const UploadProgressItem: React.FC<UploadProgressItemProps> = ({
  task,
  onCancel,
  onRetry
}) => {
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Get status icon based on task status
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'canceled':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // Get action button based on task status
  const getActionButton = () => {
    switch (task.status) {
      case 'uploading':
      case 'pending':
        return (
          <button
            onClick={onCancel}
            className="p-1 text-gray-500 hover:text-red-500 focus:outline-none"
            title="Cancel upload"
            data-testid="cancel-button"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        );
      case 'error':
        return (
          <button
            onClick={onRetry}
            className="p-1 text-gray-500 hover:text-blue-500 focus:outline-none"
            title="Retry upload"
            data-testid="retry-button"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-md shadow-sm p-3"
      data-testid="upload-progress-item"
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center space-x-2">
          {/* File icon based on type */}
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
          
          {/* File name and size */}
          <div className="flex-1 truncate">
            <span className="font-medium text-gray-900 truncate" title={task.file.name}>
              {task.file.name}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              {formatBytes(task.file.size)}
            </span>
          </div>
        </div>
        
        {/* Status and action buttons */}
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          {getActionButton()}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
        <div
          className={`h-1.5 rounded-full ${
            task.status === 'error' ? 'bg-red-500' :
            task.status === 'completed' ? 'bg-green-500' :
            task.status === 'canceled' ? 'bg-gray-400' :
            'bg-blue-500'
          }`}
          style={{ width: `${task.progress}%` }}
        ></div>
      </div>
      
      {/* Status text and progress percentage */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>
          {task.status === 'uploading' && task.uploadSpeed > 0 && (
            <>
              {formatBytes(task.bytesUploaded)} of {formatBytes(task.file.size)} • {formatBytes(task.uploadSpeed)}/s
            </>
          )}
          {task.status === 'error' && (
            <span className="text-red-500">
              {task.error || 'Upload failed'}
            </span>
          )}
          {task.status === 'completed' && 'Upload complete'}
          {task.status === 'canceled' && 'Upload canceled'}
          {task.status === 'pending' && 'Waiting to upload...'}
        </span>
        <span>{Math.round(task.progress)}%</span>
      </div>
    </div>
  );
};