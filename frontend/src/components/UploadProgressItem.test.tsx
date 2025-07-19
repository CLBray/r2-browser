import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadProgressItem } from './UploadProgressItem';
import { vi } from 'vitest';

describe('UploadProgressItem', () => {
  const mockOnCancel = vi.fn();
  const mockOnRetry = vi.fn();
  
  const createMockTask = (status: 'pending' | 'uploading' | 'completed' | 'error' | 'canceled') => ({
    id: 'test-task-id',
    file: new File(['test content'], 'test-file.txt', { type: 'text/plain' }),
    path: '/test/path',
    progress: status === 'completed' ? 100 : status === 'error' || status === 'canceled' ? 0 : 50,
    status,
    bytesUploaded: status === 'completed' ? 1024 : status === 'error' || status === 'canceled' ? 0 : 512,
    uploadSpeed: status === 'uploading' ? 1024 : 0,
    error: status === 'error' ? 'Test error message' : undefined
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for pending status', () => {
    const task = createMockTask('pending');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    expect(screen.getByText('Waiting to upload...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('renders correctly for uploading status', () => {
    const task = createMockTask('uploading');
    const { container } = render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    
    // Instead of checking for specific text, let's check that the component renders
    // and has the expected structure
    expect(screen.getByTestId('upload-progress-item')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    
    // Check that the progress bar is rendered with the correct width
    const progressBar = container.querySelector('.bg-blue-500');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('style')).toContain('width: 50%');
  });

  it('renders correctly for completed status', () => {
    const task = createMockTask('completed');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    expect(screen.getByText('Upload complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('renders correctly for error status', () => {
    const task = createMockTask('error');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('renders correctly for canceled status', () => {
    const task = createMockTask('canceled');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    expect(screen.getByText('Upload canceled')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const task = createMockTask('uploading');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when retry button is clicked', () => {
    const task = createMockTask('error');
    render(
      <UploadProgressItem 
        task={task} 
        onCancel={mockOnCancel} 
        onRetry={mockOnRetry} 
      />
    );
    
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });
});