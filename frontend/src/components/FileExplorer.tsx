// Main file explorer component

import React, { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Toolbar } from './Toolbar';
import { Breadcrumb } from './Breadcrumb';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { UploadDialog } from './UploadDialog';
import { performanceMonitor } from '../utils/performance-monitor';
import { apiClient } from '../services/api';
import type { DirectoryListing, FileObject, FolderObject } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ErrorHandler } from '../utils/error-handler';

interface FileExplorerProps {
  addAlert?: (type: 'success' | 'error' | 'warning' | 'info', message: string, action?: { label: string; onClick: () => void }, timeout?: number) => string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ addAlert }) => {
  // State for file explorer
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'lastModified'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<string>('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState<boolean>(false);
  
  const { isAuthenticated } = useAuth();
  
  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      const listing = await apiClient.listFiles(path);
      setDirectoryListing(listing);
      
      // Track successful directory load
      performanceMonitor.trackUserInteraction(
        'directory_load',
        performance.now() - startTime,
        true,
        { 
          path,
          fileCount: listing.objects.length,
          folderCount: listing.folders.length
        }
      );
    } catch (error) {
      const apiError = ErrorHandler.parseApiError(error);
      
      // Track failed directory load
      performanceMonitor.trackUserInteraction(
        'directory_load',
        performance.now() - startTime,
        false,
        { 
          path,
          error: apiError.error,
          code: apiError.code
        }
      );
      
      // Show error alert
      if (addAlert) {
        addAlert('error', `Failed to load directory: ${apiError.error}`, {
          label: 'Retry',
          onClick: () => loadDirectory(path)
        });
      }
      
      // Show sample data for development purposes
      console.log('Using sample data for development');
      setDirectoryListing({
        objects: [
          {
            key: 'sample-file-1.txt',
            name: 'sample-file-1.txt',
            size: 1024,
            lastModified: new Date(),
            etag: 'sample-etag-1',
            type: 'file',
            mimeType: 'text/plain'
          },
          {
            key: 'sample-file-2.jpg',
            name: 'sample-file-2.jpg',
            size: 2048,
            lastModified: new Date(),
            etag: 'sample-etag-2',
            type: 'file',
            mimeType: 'image/jpeg'
          },
          {
            key: 'sample-file-3.pdf',
            name: 'sample-file-3.pdf',
            size: 3072,
            lastModified: new Date(),
            etag: 'sample-etag-3',
            type: 'file',
            mimeType: 'application/pdf'
          }
        ],
        folders: [
          {
            prefix: 'sample-folder-1/',
            name: 'sample-folder-1',
            type: 'folder'
          },
          {
            prefix: 'sample-folder-2/',
            name: 'sample-folder-2',
            type: 'folder'
          }
        ],
        currentPath: path,
        hasMore: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, addAlert]);
  
  // Navigate to a specific path
  const navigateTo = useCallback((path: string) => {
    // Add to navigation history, truncating any forward history
    setNavigationHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] !== path) {
        newHistory.push(path);
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + (navigationHistory[prev] !== path ? 1 : 0);
      return newIndex;
    });
    
    setCurrentPath(path);
    loadDirectory(path);
  }, [loadDirectory, navigationHistory, historyIndex]);
  
  // Navigate back in history
  const navigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousPath = navigationHistory[newIndex];
      setCurrentPath(previousPath);
      loadDirectory(previousPath);
    }
  }, [historyIndex, navigationHistory, loadDirectory]);
  
  // Navigate up to parent directory
  const navigateUp = useCallback(() => {
    if (currentPath === '') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const parentPath = pathParts.join('/');
    navigateTo(parentPath);
  }, [currentPath, navigateTo]);
  
  // Handle folder click
  const handleFolderClick = useCallback((folder: FolderObject) => {
    navigateTo(folder.prefix);
  }, [navigateTo]);
  
  // Handle file click
  const handleFileClick = useCallback((file: FileObject) => {
    // File click handling will be implemented in a future task
    console.log('File clicked:', file);
  }, []);
  
  // Handle create folder
  const handleCreateFolder = useCallback(() => {
    // Create folder functionality will be implemented in a future task
    if (addAlert) {
      addAlert('info', 'Create folder functionality will be implemented in a future task');
    }
  }, [addAlert]);
  
  // Handle upload
  const handleUpload = useCallback((files?: File[]) => {
    if (files && files.length > 0) {
      // We'll implement the actual upload functionality in a later task
      if (addAlert) {
        addAlert('info', `Selected ${files.length} file(s) for upload. Upload functionality will be implemented in subsequent tasks.`);
      }
      console.log('Files selected for upload:', files);
    } else {
      // Show upload dialog
      setIsUploadDialogOpen(true);
    }
  }, [addAlert]);
  
  // Initial load
  useEffect(() => {
    console.log('FileExplorer component mounted');
    console.log('isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      console.log('Loading directory...');
      loadDirectory('');
    } else {
      console.log('Not authenticated, skipping directory load');
    }
  }, [isAuthenticated, loadDirectory]);
  
  // Performance tracking
  useEffect(() => {
    // Track component mount time
    const mountTime = performance.now();
    
    // Track page view
    performanceMonitor.trackPageLoad('file_explorer');
    
    return () => {
      // Track component lifetime on unmount
      const unmountTime = performance.now();
      performanceMonitor.trackUserInteraction(
        'component_lifetime',
        unmountTime - mountTime,
        true,
        { component: 'FileExplorer' }
      );
    };
  }, []);
  
  return (
    <ErrorBoundary componentName="FileExplorer">
      <div className="bg-white shadow rounded-lg overflow-hidden file-explorer">
        {/* Toolbar */}
        <Toolbar
          currentPath={currentPath}
          onNavigateBack={navigateBack}
          onNavigateUp={navigateUp}
          onRefresh={() => loadDirectory(currentPath)}
          onCreateFolder={handleCreateFolder}
          onUpload={handleUpload}
          onViewModeChange={setViewMode}
          viewMode={viewMode}
          isLoading={isLoading}
        />
        
        {/* Breadcrumb */}
        <Breadcrumb
          path={currentPath}
          onNavigate={navigateTo}
          isLoading={isLoading}
        />
        
        {/* Content area with FileList component */}
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64 p-4">
              <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : directoryListing ? (
            <>
              {/* Wrap FileList with UploadZone for drag-and-drop functionality */}
              <div className="relative">
                <FileList
                  files={directoryListing.objects}
                  folders={directoryListing.folders}
                  viewMode={viewMode}
                  onFileClick={handleFileClick}
                  onFolderClick={handleFolderClick}
                  isLoading={isLoading}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSortChange={(newSortBy, newDirection) => {
                    setSortBy(newSortBy);
                    setSortDirection(newDirection);
                    
                    // Track sort change
                    performanceMonitor.trackUserInteraction(
                      'sort_change',
                      0,
                      true,
                      { 
                        sortBy: newSortBy,
                        direction: newDirection,
                        itemCount: directoryListing.objects.length + directoryListing.folders.length
                      }
                    );
                  }}
                  filter={filter}
                  onFilterChange={(newFilter) => {
                    setFilter(newFilter);
                    
                    // Track filter change
                    performanceMonitor.trackUserInteraction(
                      'filter_change',
                      0,
                      true,
                      { 
                        filter: newFilter,
                        itemCount: directoryListing.objects.length + directoryListing.folders.length
                      }
                    );
                  }}
                />
                
                {/* Hidden UploadZone that becomes visible on drag */}
                <div 
                  className="absolute inset-0 bg-white bg-opacity-90 z-10 hidden" 
                  id="drag-overlay"
                >
                  <UploadZone
                    currentPath={currentPath}
                    onUploadStart={handleUpload}
                    onUploadComplete={() => loadDirectory(currentPath)}
                    disabled={isLoading}
                    className="h-full"
                  />
                </div>
              </div>
              
              {/* Add drag-and-drop event listeners */}
              <script dangerouslySetInnerHTML={{ __html: `
                document.addEventListener('DOMContentLoaded', () => {
                  const fileExplorer = document.querySelector('.file-explorer');
                  const dragOverlay = document.getElementById('drag-overlay');
                  
                  if (fileExplorer && dragOverlay) {
                    fileExplorer.addEventListener('dragenter', (e) => {
                      e.preventDefault();
                      dragOverlay.classList.remove('hidden');
                    });
                    
                    dragOverlay.addEventListener('dragleave', (e) => {
                      e.preventDefault();
                      if (e.relatedTarget && !dragOverlay.contains(e.relatedTarget)) {
                        dragOverlay.classList.add('hidden');
                      }
                    });
                    
                    dragOverlay.addEventListener('drop', () => {
                      dragOverlay.classList.add('hidden');
                    });
                  }
                });
              `}} />
              
              {/* Upload Dialog */}
              <UploadDialog
                isOpen={isUploadDialogOpen}
                onClose={() => setIsUploadDialogOpen(false)}
                currentPath={currentPath}
                onUploadComplete={() => {
                  setIsUploadDialogOpen(false);
                  loadDirectory(currentPath);
                }}
              />
            </>
          ) : (
            <div className="text-center py-12 p-4">
              <p className="text-gray-500">No data available. Please try refreshing.</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};