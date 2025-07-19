import React, { useRef, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { performanceMonitor } from '../utils/performance-monitor';

interface UploadZoneProps {
  currentPath: string;
  onUploadStart: (files: File[]) => void;
  onUploadComplete: () => void;
  disabled?: boolean;
  className?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  currentPath,
  onUploadStart,
  onUploadComplete,
  disabled = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled || acceptedFiles.length === 0) return;

    // Track upload start in performance monitoring
    performanceMonitor.trackUserInteraction(
      'upload_start',
      0,
      true,
      {
        fileCount: acceptedFiles.length,
        totalSize: acceptedFiles.reduce((sum, file) => sum + file.size, 0),
        path: currentPath
      }
    );

    // Call the parent component's upload handler
    onUploadStart(acceptedFiles);
  }, [currentPath, onUploadStart, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false)
  });

  const handleUploadButtonClick = () => {
    // Trigger the hidden file input's click event
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Combine default styles with active/dragging states and custom className
  const dropzoneClasses = `
    ${className}
    flex flex-col items-center justify-center
    border-2 border-dashed rounded-lg p-6
    transition-colors duration-200
    ${isDragging || isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}
  `.trim();

  return (
    <div className="upload-zone w-full">
      <div {...getRootProps({ className: dropzoneClasses })}>
        <input {...getInputProps()} ref={fileInputRef} multiple />
        
        <svg 
          className={`w-12 h-12 mb-3 ${isDragging || isDragActive ? 'text-blue-500' : 'text-gray-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        
        <p className="mb-2 text-sm text-gray-500">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          Upload files to {currentPath || 'root directory'}
        </p>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          className={`
            px-4 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={handleUploadButtonClick}
          disabled={disabled}
          data-testid="upload-button"
        >
          Upload Files
        </button>
      </div>
    </div>
  );
};