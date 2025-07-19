import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDialog } from './UploadDialog';
import { vi } from 'vitest';

// Mock the UploadZone component
vi.mock('./UploadZone', () => ({
  UploadZone: ({ currentPath, onUploadStart }) => (
    <div data-testid="upload-zone-mock">
      <button 
        onClick={() => onUploadStart([new File(['test'], 'test.txt')])}
        data-testid="mock-upload-button"
      >
        Mock Upload Button
      </button>
      <div>Current path: {currentPath}</div>
    </div>
  )
}));

// Mock the UploadProgressItem component
vi.mock('./UploadProgressItem', () => ({
  UploadProgressItem: ({ task, onCancel, onRetry }) => (
    <div data-testid="upload-progress-item-mock">
      <div>File: {task.file.name}</div>
      <div>Status: {task.status}</div>
      <div>Progress: {task.progress}%</div>
      <button onClick={onCancel} data-testid="mock-cancel-button">Cancel</button>
      <button onClick={onRetry} data-testid="mock-retry-button">Retry</button>
    </div>
  )
}));

// Mock the performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackUserInteraction: vi.fn()
  }
}));

// Mock window.confirm
const originalConfirm = window.confirm;
window.confirm = vi.fn();

describe('UploadDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnUploadComplete = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    currentPath: '/test/path',
    onUploadComplete: mockOnUploadComplete
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true); // Default to confirming
  });

  afterAll(() => {
    window.confirm = originalConfirm;
  });

  it('renders correctly when open', () => {
    render(<UploadDialog {...defaultProps} />);
    
    expect(screen.getByText(/Upload Files to \/test\/path/i)).toBeInTheDocument();
    expect(screen.getByTestId('upload-zone-mock')).toBeInTheDocument();
    expect(screen.getByText(/No files selected for upload/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UploadDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<UploadDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('adds files to upload queue when upload is triggered', async () => {
    render(<UploadDialog {...defaultProps} />);
    
    // Trigger file upload
    fireEvent.click(screen.getByTestId('mock-upload-button'));
    
    // Wait for the upload task to be added
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-item-mock')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/File: test.txt/i)).toBeInTheDocument();
  });

  it('shows confirmation dialog when closing with uploads in progress', async () => {
    render(<UploadDialog {...defaultProps} />);
    
    // Trigger file upload
    fireEvent.click(screen.getByTestId('mock-upload-button'));
    
    // Wait for the upload task to be added
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-item-mock')).toBeInTheDocument();
    });
    
    // Try to close the dialog
    fireEvent.click(screen.getByLabelText('Close'));
    
    // Confirm dialog should have been shown
    expect(window.confirm).toHaveBeenCalledWith('Uploads are in progress. Are you sure you want to close the dialog?');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('cancels a task when cancel button is clicked', async () => {
    render(<UploadDialog {...defaultProps} />);
    
    // Trigger file upload
    fireEvent.click(screen.getByTestId('mock-upload-button'));
    
    // Wait for the upload task to be added
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-item-mock')).toBeInTheDocument();
    });
    
    // Cancel the task
    fireEvent.click(screen.getByTestId('mock-cancel-button'));
    
    // The task should be marked as canceled
    await waitFor(() => {
      expect(screen.getByText(/Status: canceled/i)).toBeInTheDocument();
    });
  });

  it('retries a task when retry button is clicked', async () => {
    render(<UploadDialog {...defaultProps} />);
    
    // Trigger file upload
    fireEvent.click(screen.getByTestId('mock-upload-button'));
    
    // Wait for the upload task to be added
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-item-mock')).toBeInTheDocument();
    });
    
    // Cancel the task first to get it in a state where it can be retried
    fireEvent.click(screen.getByTestId('mock-cancel-button'));
    
    // Retry the task
    fireEvent.click(screen.getByTestId('mock-retry-button'));
    
    // The task should be marked as pending again
    await waitFor(() => {
      expect(screen.getByText(/Status: pending/i)).toBeInTheDocument();
    });
  });

  it('shows cancel all button when uploads are in progress', async () => {
    render(<UploadDialog {...defaultProps} />);
    
    // Trigger file upload
    fireEvent.click(screen.getByTestId('mock-upload-button'));
    
    // Wait for the upload task to be added
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-item-mock')).toBeInTheDocument();
    });
    
    // Cancel All button should be enabled
    const cancelAllButton = screen.getByText('Cancel All');
    expect(cancelAllButton).not.toBeDisabled();
    
    // Click Cancel All
    fireEvent.click(cancelAllButton);
    
    // Confirm dialog should have been shown
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to cancel all uploads?');
  });
});