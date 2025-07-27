import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DownloadManager, useDownloadManager } from './DownloadManager';
import type { FileObject } from '../types';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    downloadFile: vi.fn(),
  },
}));

// Mock the error handler
vi.mock('../utils/error-handler', () => ({
  ErrorHandler: {
    parseApiError: vi.fn((error) => ({ error: error.message, code: 'TEST_ERROR' })),
    getUserFriendlyMessage: vi.fn((error) => error.error),
    logError: vi.fn(),
  },
}));

// Mock the performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackUserInteraction: vi.fn(),
    trackError: vi.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

describe('DownloadManager', () => {
  const mockFile: FileObject = {
    key: 'test-file.txt',
    name: 'test-file.txt',
    size: 1024,
    lastModified: new Date(),
    etag: 'test-etag',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no downloads', () => {
    render(
      <DownloadManager
        isVisible={true}
        onClose={vi.fn()}
        downloadRequests={[]}
        onDownloadRequestProcessed={vi.fn()}
      />
    );

    expect(screen.getByText('No downloads yet')).toBeInTheDocument();
  });

  it('should show download manager when visible', () => {
    render(
      <DownloadManager
        isVisible={true}
        onClose={vi.fn()}
        downloadRequests={[]}
        onDownloadRequestProcessed={vi.fn()}
      />
    );

    expect(screen.getByText('Downloads')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(
      <DownloadManager
        isVisible={false}
        onClose={vi.fn()}
        downloadRequests={[]}
        onDownloadRequestProcessed={vi.fn()}
      />
    );

    expect(screen.queryByText('Downloads')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <DownloadManager
        isVisible={true}
        onClose={onClose}
        downloadRequests={[]}
        onDownloadRequestProcessed={vi.fn()}
      />
    );

    // Find the close button by its SVG content (X icon)
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should show file name when download request is added', () => {
    render(
      <DownloadManager
        isVisible={true}
        onClose={vi.fn()}
        downloadRequests={[mockFile]}
        onDownloadRequestProcessed={vi.fn()}
      />
    );

    // The file name should appear in the UI
    expect(screen.getByText('test-file.txt')).toBeInTheDocument();
  });
});

describe('useDownloadManager', () => {
  const testFile: FileObject = {
    key: 'hook-test-file.txt',
    name: 'hook-test-file.txt',
    size: 2048,
    lastModified: new Date(),
    etag: 'hook-test-etag',
  };

  it('should provide download manager functionality', () => {
    const TestComponent = () => {
      const { DownloadManagerComponent, isVisible, showDownloadManager, downloadFile } = useDownloadManager();
      
      return (
        <div>
          <button onClick={showDownloadManager}>Show Downloads</button>
          <button onClick={() => downloadFile(testFile)}>Download File</button>
          <span>{isVisible ? 'Visible' : 'Hidden'}</span>
          <DownloadManagerComponent />
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Hidden')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show Downloads'));
    expect(screen.getByText('Visible')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Download File'));
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });
});