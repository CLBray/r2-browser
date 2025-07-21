// Toolbar component for file explorer navigation and actions

import React from 'react';

interface ToolbarProps {
  currentPath: string;
  onNavigateBack: () => void;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentPath,
  onNavigateBack,
  onNavigateUp,
  onRefresh,
  onCreateFolder,
  onUpload,
  onViewModeChange,
  viewMode,
  isLoading
}) => {
  return (
    <div className="bg-white/50 backdrop-blur-sm border-b border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Navigation buttons */}
        <button
          onClick={onNavigateBack}
          className="p-2 rounded-xl text-gray-600 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Back"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          onClick={onNavigateUp}
          className="p-2 rounded-xl text-gray-600 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Up to parent folder"
          disabled={currentPath === '' || isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl text-gray-600 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Action buttons */}
        <button
          onClick={onCreateFolder}
          className="p-2 rounded-xl text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create new folder"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          onClick={onUpload}
          className="p-2 rounded-xl text-gray-600 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload files"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* View mode toggle */}
        <div className="border border-gray-200 rounded-xl flex overflow-hidden shadow-sm">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm' : 'text-gray-600 hover:bg-sky-50 hover:text-sky-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Grid view"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm' : 'text-gray-600 hover:bg-sky-50 hover:text-sky-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            title="List view"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};