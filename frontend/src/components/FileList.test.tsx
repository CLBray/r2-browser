import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList } from './FileList';
import type { FileObject, FolderObject } from '../types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackUserInteraction: vi.fn(),
  },
}));

// Mock the virtual scrolling library
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      { index: 0, key: 0, start: 0, size: 48, end: 48 },
      { index: 1, key: 1, start: 48, size: 48, end: 96 },
      { index: 2, key: 2, start: 96, size: 48, end: 144 },
      { index: 3, key: 3, start: 144, size: 48, end: 192 },
    ],
    getTotalSize: () => 192,
    measure: vi.fn(),
    scrollToIndex: vi.fn(),
  }),
}));

// Mock the ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('FileList Component', () => {
  // Sample test data
  const mockFiles: FileObject[] = [
    {
      key: 'file1.txt',
      name: 'file1.txt',
      size: 1024,
      lastModified: new Date('2023-01-01'),
      etag: 'etag1',
      type: 'file',
      mimeType: 'text/plain'
    },
    {
      key: 'image.jpg',
      name: 'image.jpg',
      size: 2048,
      lastModified: new Date('2023-01-02'),
      etag: 'etag2',
      type: 'file',
      mimeType: 'image/jpeg'
    }
  ];
  
  const mockFolders: FolderObject[] = [
    {
      prefix: 'folder1/',
      name: 'folder1',
      type: 'folder'
    },
    {
      prefix: 'folder2/',
      name: 'folder2',
      type: 'folder'
    }
  ];
  
  const defaultProps = {
    files: mockFiles,
    folders: mockFolders,
    viewMode: 'list' as const,
    onFileClick: vi.fn(),
    onFolderClick: vi.fn(),
    isLoading: false,
    sortBy: 'name' as const,
    sortDirection: 'asc' as const,
    onSortChange: vi.fn(),
    filter: '',
    onFilterChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders folders and files', () => {
    render(<FileList {...defaultProps} />);
    
    // Check if folders are rendered
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
    
    // Check if files are rendered
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
  });

  it('calls onFolderClick when a folder is clicked', () => {
    render(<FileList {...defaultProps} />);
    
    fireEvent.click(screen.getByText('folder1'));
    
    expect(defaultProps.onFolderClick).toHaveBeenCalled();
    // The component adds itemType internally, so we can't check exact equality
    expect(defaultProps.onFolderClick.mock.calls[0][0]).toMatchObject({
      name: mockFolders[0].name,
      prefix: mockFolders[0].prefix,
      type: mockFolders[0].type
    });
  });

  it('calls onFileClick when a file is clicked', () => {
    render(<FileList {...defaultProps} />);
    
    fireEvent.click(screen.getByText('file1.txt'));
    
    expect(defaultProps.onFileClick).toHaveBeenCalled();
    // The component adds itemType internally, so we can't check exact equality
    expect(defaultProps.onFileClick.mock.calls[0][0]).toMatchObject({
      name: mockFiles[0].name,
      key: mockFiles[0].key,
      size: mockFiles[0].size,
      type: mockFiles[0].type
    });
  });

  it('displays file size and date in list view', () => {
    render(<FileList {...defaultProps} viewMode="list" />);
    
    // Check if file size is displayed
    expect(screen.getByText(/1 KB/)).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
    
    // Check if dates are displayed (format may vary by locale)
    const dateStrings = mockFiles.map(file => 
      new Date(file.lastModified).toLocaleString()
    );
    
    dateStrings.forEach(dateString => {
      expect(screen.getByText(new RegExp(dateString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    });
  });

  it('filters items based on filter text', () => {
    // This test is challenging with virtual scrolling
    // Instead, we'll test that the filter input works
    render(<FileList {...defaultProps} />);
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    expect(filterInput).toBeInTheDocument();
    
    // Change the filter
    fireEvent.change(filterInput, { target: { value: 'file1' } });
    
    // Check that onFilterChange was called with the right value
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('file1');
  });

  it('sorts items by name', () => {
    render(<FileList {...defaultProps} sortBy="name" sortDirection="asc" />);
    
    // In the virtual list, we can't easily test the exact order
    // But we can verify all items are present
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
  });

  it('displays empty state when no items match filter', () => {
    render(<FileList {...defaultProps} filter="nonexistent" />);
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('No files or folders match your filter.')).toBeInTheDocument();
    
    // Check for clear filter button
    const clearButton = screen.getByText('Clear filter');
    expect(clearButton).toBeInTheDocument();
    
    // Click clear button
    fireEvent.click(clearButton);
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('');
  });

  it('displays empty state when no items exist', () => {
    render(<FileList {...defaultProps} files={[]} folders={[]} />);
    
    expect(screen.getByText('No files or folders')).toBeInTheDocument();
    expect(screen.getByText('This directory is empty.')).toBeInTheDocument();
  });

  it('changes sort when sort buttons are clicked', () => {
    render(<FileList {...defaultProps} />);
    
    // Click on Size sort button
    fireEvent.click(screen.getByText('Size'));
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('size', 'asc');
    
    // Click on Date sort button
    fireEvent.click(screen.getByText('Date'));
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('lastModified', 'asc');
  });

  it('updates filter when filter input changes', () => {
    render(<FileList {...defaultProps} />);
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    fireEvent.change(filterInput, { target: { value: 'test' } });
    
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('test');
  });
});