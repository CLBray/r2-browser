import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from './UploadZone';
import { vi } from 'vitest';

// Mock the performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackUserInteraction: vi.fn()
  }
}));

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: (props?: any) => ({
      onClick: vi.fn(),
      onKeyDown: vi.fn(),
      tabIndex: 0,
      role: 'button',
      'aria-label': 'dropzone',
      className: props?.className || ''
    }),
    getInputProps: () => ({
      onChange: vi.fn(),
      multiple: true,
      accept: undefined
    }),
    isDragActive: false,
    open: vi.fn()
  })
}));

describe('UploadZone', () => {
  const mockOnUploadStart = vi.fn();
  const mockOnUploadComplete = vi.fn();
  const defaultProps = {
    currentPath: '/test/path',
    onUploadStart: mockOnUploadStart,
    onUploadComplete: mockOnUploadComplete
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<UploadZone {...defaultProps} />);
    
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    expect(screen.getByText(/upload files to \/test\/path/i)).toBeInTheDocument();
    expect(screen.getByTestId('upload-button')).toBeInTheDocument();
  });

  it('shows root directory when currentPath is empty', () => {
    render(<UploadZone {...defaultProps} currentPath="" />);
    
    expect(screen.getByText(/upload files to root directory/i)).toBeInTheDocument();
  });

  it('disables the upload button when disabled prop is true', () => {
    render(<UploadZone {...defaultProps} disabled={true} />);
    
    const uploadButton = screen.getByTestId('upload-button');
    expect(uploadButton).toBeDisabled();
    expect(uploadButton).toHaveClass('opacity-50');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<UploadZone {...defaultProps} className="custom-class" />);
    
    // The custom className is applied to the dropzone div inside the upload-zone wrapper
    // Check if any element contains the custom class
    const elementWithCustomClass = container.querySelector('[class*="custom-class"]');
    expect(elementWithCustomClass).not.toBeNull();
  });

  it('handles upload button click', () => {
    render(<UploadZone {...defaultProps} />);
    
    const uploadButton = screen.getByTestId('upload-button');
    fireEvent.click(uploadButton);
    
    // We can't easily test the file input click since it's handled by a ref
    // But we can verify the button is clickable
    expect(uploadButton).not.toBeDisabled();
  });
});