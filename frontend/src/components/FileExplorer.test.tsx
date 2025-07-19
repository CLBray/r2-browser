import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FileExplorer } from './FileExplorer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Mock FileList component to simplify testing
vi.mock('./FileList', () => ({
  FileList: ({ files, folders, isLoading }) => (
    <div data-testid="file-list-mock">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {folders.map(folder => (
            <div key={folder.prefix} data-testid="folder-item">{folder.name}</div>
          ))}
          {files.map(file => (
            <div key={file.key} data-testid="file-item">{file.name}</div>
          ))}
          {folders.length === 0 && files.length === 0 && (
            <div>No files or folders</div>
          )}
        </div>
      )}
    </div>
  )
}));

// Mock dependencies
vi.mock('../services/api', () => ({
  apiClient: {
    listFiles: vi.fn()
  }
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackPageLoad: vi.fn(),
    trackUserInteraction: vi.fn()
  }
}));

describe('FileExplorer', () => {
  const mockAddAlert = vi.fn();
  
  const mockDirectoryListing = {
    objects: [
      { key: 'file1.txt', name: 'file1.txt', size: 1024, lastModified: new Date(), etag: '123', type: 'file' },
      { key: 'file2.jpg', name: 'file2.jpg', size: 2048, lastModified: new Date(), etag: '456', type: 'file' }
    ],
    folders: [
      { prefix: 'folder1/', name: 'folder1', type: 'folder' },
      { prefix: 'folder2/', name: 'folder2', type: 'folder' }
    ],
    currentPath: '',
    hasMore: false
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth hook
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      bucketName: 'test-bucket'
    });
    
    // Mock API response
    (apiClient.listFiles as any).mockResolvedValue(mockDirectoryListing);
  });
  
  it('renders loading state initially', () => {
    render(<FileExplorer addAlert={mockAddAlert} />);
    
    // Should show loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
  
  it('renders toolbar and breadcrumb components', async () => {
    render(<FileExplorer addAlert={mockAddAlert} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.listFiles).toHaveBeenCalled();
    });
    
    // Toolbar buttons should be present
    expect(screen.getByTitle('Back')).toBeInTheDocument();
    expect(screen.getByTitle('Up to parent folder')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
    
    // Breadcrumb navigation should be present
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });
  
  it('displays folders and files when data is loaded', async () => {
    render(<FileExplorer addAlert={mockAddAlert} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.listFiles).toHaveBeenCalled();
    });
    
    // Should render the FileList component with data
    expect(screen.getByTestId('file-list-mock')).toBeInTheDocument();
    
    // Should display folders
    expect(screen.getAllByTestId('folder-item').length).toBe(2);
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
    
    // Should display files
    expect(screen.getAllByTestId('file-item').length).toBe(2);
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.jpg')).toBeInTheDocument();
  });
  
  it('displays empty state when no files or folders exist', async () => {
    // Mock empty directory
    (apiClient.listFiles as any).mockResolvedValue({
      objects: [],
      folders: [],
      currentPath: '',
      hasMore: false
    });
    
    render(<FileExplorer addAlert={mockAddAlert} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(apiClient.listFiles).toHaveBeenCalled();
    });
    
    // Should display empty state message
    expect(screen.getByText('No files or folders')).toBeInTheDocument();
  });
  
  it('shows error alert when API call fails', async () => {
    // Mock API error
    const error = new Error('Failed to load directory');
    (apiClient.listFiles as any).mockRejectedValue(error);
    
    render(<FileExplorer addAlert={mockAddAlert} />);
    
    // Wait for error handling
    await waitFor(() => {
      expect(apiClient.listFiles).toHaveBeenCalled();
    });
    
    // Should call addAlert with error message
    expect(mockAddAlert).toHaveBeenCalledWith(
      'error',
      'Failed to load directory: Failed to load directory',
      expect.any(Object)
    );
  });
});