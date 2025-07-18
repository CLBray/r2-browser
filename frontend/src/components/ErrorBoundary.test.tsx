import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { performanceMonitor } from '../utils/performance-monitor';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    trackError: vi.fn(),
    trackUserInteraction: vi.fn()
  }
}));

// Component that throws an error
const ErrorComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress console errors during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
  
  it('renders fallback UI when there is an error', () => {
    // Using try-catch because React logs errors during render
    try {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    } catch (e) {
      // Ignore the error
    }
    
    // Wait for error boundary to catch the error and render fallback
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
  
  it('tracks errors with performance monitor', () => {
    // Using try-catch because React logs errors during render
    try {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    } catch (e) {
      // Ignore the error
    }
    
    expect(performanceMonitor.trackError).toHaveBeenCalledWith(
      'react_error',
      'Test error',
      'component:TestComponent',
      expect.any(String),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
  
  it('resets error state when reset button is clicked', () => {
    // Using try-catch because React logs errors during render
    try {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    } catch (e) {
      // Ignore the error
    }
    
    // Click the reset button
    fireEvent.click(screen.getByText('Try again'));
    
    // Should track the error recovery
    expect(performanceMonitor.trackUserInteraction).toHaveBeenCalledWith(
      'error_recovery',
      0,
      true,
      expect.objectContaining({
        errorMessage: 'Test error'
      })
    );
  });
  
  it('uses custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;
    
    // Using try-catch because React logs errors during render
    try {
      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    } catch (e) {
      // Ignore the error
    }
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
  
  it('calls onError prop when there is an error', () => {
    const onError = vi.fn();
    
    // Using try-catch because React logs errors during render
    try {
      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    } catch (e) {
      // Ignore the error
    }
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });
});