import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler } from '../utils/error-handler';
import { performanceMonitor } from '../utils/performance-monitor';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component for catching and handling React component errors
 * Enhanced with performance monitoring and error tracking
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const componentName = this.props.componentName || 'unknown';
    
    // Log the error using ErrorHandler
    ErrorHandler.logError(error, { 
      componentStack: errorInfo.componentStack,
      componentName 
    });
    
    // Track the error in performance monitoring
    performanceMonitor.trackError(
      'react_error',
      error.message || 'React component error',
      `component:${componentName}`,
      error.stack,
      { componentStack: errorInfo.componentStack }
    );
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
    
    // Track error recovery
    if (this.state.error) {
      performanceMonitor.trackUserInteraction(
        'error_recovery',
        0,
        true,
        { 
          componentName: this.props.componentName,
          errorMessage: this.state.error.message
        }
      );
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function' && this.state.error) {
          return this.props.fallback(this.state.error, this.resetError);
        }
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-medium text-red-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-700">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-md"
            data-testid="error-reset-button"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}