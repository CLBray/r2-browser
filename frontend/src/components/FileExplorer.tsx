// Main file explorer component

import React, { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Toolbar } from './Toolbar';
import { Breadcrumb } from './Breadcrumb';
import { performanceMonitor } from '../utils/performance-monitor';
import { apiClient } from '../services/api';
import { DirectoryListing, FileObject, FolderObject } from '../types';
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
  const handleUpload = useCallback(() => {
    // Upload functionality will be implemented in a future task
    if (addAlert) {
      addAlert('info', 'Upload functionality will be implemented in a future task');
    }
  }, [addAlert]);
  
  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadDirectory('');
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
        
        {/* Content area - placeholder for now */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : directoryListing ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}`}>
              {/* Folders */}
              {directoryListing.folders.length === 0 && directoryListing.objects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No files or folders</h3>
                  <p className="mt-1 text-sm text-gray-500">This directory is empty.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleUpload}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      Upload files
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {directoryListing.folders.map((folder) => (
                    <div 
                      key={folder.prefix}
                      onClick={() => handleFolderClick(folder)}
                      className={`cursor-pointer ${
                        viewMode === 'grid' 
                          ? 'p-4 border rounded-lg hover:bg-gray-50 flex flex-col items-center' 
                          : 'p-2 border rounded hover:bg-gray-50 flex items-center'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`${viewMode === 'grid' ? 'h-12 w-12' : 'h-6 w-6 mr-3'} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className={`${viewMode === 'grid' ? 'mt-2 text-center' : ''} truncate`}>{folder.name}</span>
                    </div>
                  ))}
                  
                  {/* Files - placeholder for now */}
                  {directoryListing.objects.map((file) => (
                    <div 
                      key={file.key}
                      onClick={() => handleFileClick(file)}
                      className={`cursor-pointer ${
                        viewMode === 'grid' 
                          ? 'p-4 border rounded-lg hover:bg-gray-50 flex flex-col items-center' 
                          : 'p-2 border rounded hover:bg-gray-50 flex items-center'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`${viewMode === 'grid' ? 'h-12 w-12' : 'h-6 w-6 mr-3'} text-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className={`${viewMode === 'grid' ? 'mt-2 text-center' : 'flex-grow'}`}>
                        <div className="truncate">{file.name}</div>
                        {viewMode === 'list' && (
                          <div className="text-xs text-gray-500">
                            {new Intl.NumberFormat().format(file.size)} bytes • {new Date(file.lastModified).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No data available. Please try refreshing.</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};