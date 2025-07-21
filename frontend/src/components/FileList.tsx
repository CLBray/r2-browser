// FileList component with virtual scrolling for file explorer

import React, { useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileObject, FolderObject } from '../types';
import { performanceMonitor } from '../utils/performance-monitor';

interface FileListProps {
  files: FileObject[];
  folders: FolderObject[];
  viewMode: 'grid' | 'list';
  onFileClick: (file: FileObject) => void;
  onFolderClick: (folder: FolderObject) => void;
  onFileDownload?: (file: FileObject) => void;
  isLoading: boolean;
  sortBy: 'name' | 'size' | 'lastModified';
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'size' | 'lastModified', direction: 'asc' | 'desc') => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  folders,
  viewMode,
  onFileClick,
  onFolderClick,
  onFileDownload,
  isLoading,
  sortBy,
  sortDirection,
  onSortChange,
  filter,
  onFilterChange,
}) => {
  // Reference for the parent container
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  // State for container dimensions
  const [parentWidth, setParentWidth] = useState(0);
  const [parentHeight, setParentHeight] = useState(0);
  
  // Calculate columns for grid view based on container width
  const columns = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (parentWidth < 640) return 1; // sm
    if (parentWidth < 768) return 2; // md
    if (parentWidth < 1024) return 3; // lg
    if (parentWidth < 1280) return 4; // xl
    return 5; // 2xl
  }, [parentWidth, viewMode]);
  
  // Filter and sort items
  const filteredItems = useMemo(() => {
    // Start with all items
    let items = [
      ...folders.map(folder => ({ ...folder, itemType: 'folder' as const })),
      ...files.map(file => ({ ...file, itemType: 'file' as const }))
    ];
    
    // Apply filter if provided
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      items = items.filter(item => 
        'name' in item && item.name.toLowerCase().includes(lowerFilter)
      );
    }
    
    // Apply sorting
    items.sort((a, b) => {
      // Always put folders before files
      if (a.itemType === 'folder' && b.itemType === 'file') return -1;
      if (a.itemType === 'file' && b.itemType === 'folder') return 1;
      
      // Sort by the selected field
      if (sortBy === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortBy === 'size') {
        // Only files have size
        if (a.itemType === 'folder' && b.itemType === 'folder') {
          return sortDirection === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        
        if (a.itemType === 'file' && b.itemType === 'file') {
          return sortDirection === 'asc'
            ? a.size - b.size
            : b.size - a.size;
        }
      }
      
      if (sortBy === 'lastModified') {
        // Only files have lastModified
        if (a.itemType === 'folder' && b.itemType === 'folder') {
          return sortDirection === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        
        if (a.itemType === 'file' && b.itemType === 'file') {
          const dateA = new Date(a.lastModified).getTime();
          const dateB = new Date(b.lastModified).getTime();
          return sortDirection === 'asc'
            ? dateA - dateB
            : dateB - dateA;
        }
      }
      
      return 0;
    });
    
    return items;
  }, [folders, files, filter, sortBy, sortDirection]);
  
  // Calculate rows for virtualization
  const rows = useMemo(() => {
    if (viewMode === 'list') {
      return filteredItems;
    } else {
      // For grid view, we need to organize items into rows based on column count
      const result = [];
      for (let i = 0; i < filteredItems.length; i += columns) {
        result.push(filteredItems.slice(i, i + columns));
      }
      return result;
    }
  }, [filteredItems, columns, viewMode]);
  
  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewMode === 'grid' ? 160 : 80, // Increased height for card design
    overscan: 5, // Number of items to render outside of the visible area
  });
  
  // Update parent dimensions on resize
  useEffect(() => {
    if (!parentRef.current) return;
    
    const updateSize = () => {
      if (parentRef.current) {
        setParentWidth(parentRef.current.offsetWidth);
        setParentHeight(parentRef.current.offsetHeight);
      }
    };
    
    // Initial size
    updateSize();
    
    // Add resize observer
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(parentRef.current);
    
    return () => {
      if (parentRef.current) {
        resizeObserver.unobserve(parentRef.current);
      }
    };
  }, []);
  
  // Track component render performance
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      performanceMonitor.trackUserInteraction(
        'file_list_render',
        endTime - startTime,
        true,
        {
          viewMode,
          itemCount: filteredItems.length,
          virtualRows: rowVirtualizer.getVirtualItems().length,
        }
      );
    };
  }, [filteredItems.length, rowVirtualizer, viewMode]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: (typeof filteredItems)[0];
  } | null>(null);

  // Handle item click
  const handleItemClick = (item: (typeof filteredItems)[0]) => {
    if (item.itemType === 'folder') {
      onFolderClick(item as FolderObject);
    } else {
      onFileClick(item as FileObject);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, item: (typeof filteredItems)[0]) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  // Handle download
  const handleDownload = (file: FileObject) => {
    if (onFileDownload) {
      onFileDownload(file);
    }
    setContextMenu(null);
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);
  
  // Get appropriate icon for file type with modern colorful design
  const getFileIcon = (file: FileObject) => {
    const mimeType = file.mimeType || '';
    
    if (mimeType.startsWith('image/')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    
    if (mimeType.startsWith('video/')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      );
    }
    
    if (mimeType.includes('pdf')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
      );
    }
    
    // Default file icon
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  // Get folder icon with modern colorful design
  const getFolderIcon = () => {
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
    );
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };
  
  // Render sorting controls with modern design
  const renderSortControls = () => {
    return (
      <div className="flex items-center mb-6 px-2">
        <div className="text-sm text-gray-600 mr-3 font-medium">Sort by:</div>
        <div className="flex space-x-2">
          {['name', 'size', 'lastModified'].map((option) => (
            <button
              key={option}
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                sortBy === option 
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-sky-50 hover:text-sky-700 border border-gray-200 hover:border-sky-300'
              }`}
              onClick={() => {
                if (sortBy === option) {
                  // Toggle direction if already selected
                  onSortChange(option as any, sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  // Default to ascending for new sort field
                  onSortChange(option as any, 'asc');
                }
              }}
            >
              {option === 'name' ? 'Name' : option === 'size' ? 'Size' : 'Date'}
              {sortBy === option && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Filter files..."
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
      </div>
    );
  };
  
  // Render empty state with modern design
  if (filteredItems.length === 0) {
    return (
      <div className="p-6">
        {renderSortControls()}
        <div className="text-center py-16">
          {filter ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-6">No files or folders match your filter criteria.</p>
              <button
                type="button"
                onClick={() => onFilterChange('')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                Clear filter
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No files or folders</h3>
              <p className="text-gray-600">This directory is empty. Upload some files to get started!</p>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {renderSortControls()}
      
      <div 
        ref={parentRef}
        className="overflow-auto"
        style={{ height: 'calc(100vh - 240px)', width: '100%' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            
            if (viewMode === 'list') {
              // List view - one item per row
              const item = row as (typeof filteredItems)[0];
              
              return (
                <div
                  key={`${item.itemType}-${item.itemType === 'folder' ? item.prefix : item.key}`}
                  className="absolute top-0 left-0 w-full px-2"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div 
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-sky-200"
                    onClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <div className="mr-4">
                      {item.itemType === 'folder' ? getFolderIcon() : getFileIcon(item as FileObject)}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="font-medium text-gray-900 truncate">{item.name}</div>
                      {item.itemType === 'file' && (
                        <div className="text-sm text-gray-500 mt-1">
                          {formatFileSize((item as FileObject).size)} • {formatDate((item as FileObject).lastModified)}
                        </div>
                      )}
                      {item.itemType === 'folder' && (
                        <div className="text-sm text-gray-500 mt-1">Folder</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              // Grid view - multiple items per row
              const rowItems = row as (typeof filteredItems)[];
              
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full px-2"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {rowItems.map((item) => (
                      <div
                        key={`${item.itemType}-${item.itemType === 'folder' ? item.prefix : item.key}`}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:border-sky-200"
                        onClick={() => handleItemClick(item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <div className="mb-3">
                          {item.itemType === 'folder' ? getFolderIcon() : getFileIcon(item as FileObject)}
                        </div>
                        
                        <div className="text-center w-full">
                          <div className="font-medium text-gray-900 truncate text-sm">{item.name}</div>
                          {item.itemType === 'file' && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {formatFileSize((item as FileObject).size)}
                            </div>
                          )}
                          {item.itemType === 'folder' && (
                            <div className="text-xs text-gray-500 mt-1">Folder</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Context Menu with modern design */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {contextMenu.item.itemType === 'file' && onFileDownload && (
            <button
              className="w-full px-4 py-3 text-left text-sm hover:bg-sky-50 hover:text-sky-700 flex items-center transition-colors duration-150 font-medium"
              onClick={() => handleDownload(contextMenu.item as FileObject)}
            >
              <div className="w-5 h-5 mr-3 rounded bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              Download
            </button>
          )}
          {contextMenu.item.itemType === 'folder' && (
            <button
              className="w-full px-4 py-3 text-left text-sm hover:bg-sky-50 hover:text-sky-700 flex items-center transition-colors duration-150 font-medium"
              onClick={() => {
                handleItemClick(contextMenu.item);
                closeContextMenu();
              }}
            >
              <div className="w-5 h-5 mr-3 rounded bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              Open Folder
            </button>
          )}
        </div>
      )}
    </div>
  );
};