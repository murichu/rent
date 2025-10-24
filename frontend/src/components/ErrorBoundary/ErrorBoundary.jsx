import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling with user-friendly fallbacks
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      retryCount: this.state.retryCount,
    };

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, or custom error service
      // errorReportingService.captureException(error, errorReport);
      console.error('Error Report:', errorReport);
    }

    // Store error in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorBoundaryLogs') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('errorBoundaryLogs', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  };

  getUserId = () => {
    // Get user ID from auth store or localStorage
    try {
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      return authData.state?.user?.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard');
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(errorDetails, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Error details copied to clipboard');
      });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI based on error type and context
      const { fallback: CustomFallback, level = 'component' } = this.props;
      
      if (CustomFallback) {
        return (
          <CustomFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            retry={this.handleRetry}
            errorId={this.state.errorId}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  {level === 'app' ? 'Application Error' : 'Something went wrong'}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {level === 'app' 
                    ? 'The application encountered an unexpected error.'
                    : 'This component failed to load properly.'
                  }
                </p>
                
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md text-left">
                    <p className="text-xs font-mono text-red-800 break-all">
                      {this.state.error?.message}
                    </p>
                  </div>
                )}
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  
                  {level === 'app' && (
                    <>
                      <button
                        onClick={this.handleReload}
                        className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reload Page
                      </button>
                      
                      <button
                        onClick={this.handleGoHome}
                        className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Go to Dashboard
                      </button>
                    </>
                  )}
                </div>
                
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={this.copyErrorDetails}
                      className="w-full flex justify-center items-center px-4 py-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Bug className="w-3 h-3 mr-1" />
                      Copy Error Details
                    </button>
                    <p className="mt-2 text-xs text-gray-400">
                      Error ID: {this.state.errorId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary = ({ children, fallback }) => (
  <ErrorBoundary level="component" fallback={fallback}>
    {children}
  </ErrorBoundary>
);

export const AppErrorBoundary = ({ children }) => (
  <ErrorBoundary level="app">
    {children}
  </ErrorBoundary>
);

// Custom fallback components
export const SimpleErrorFallback = ({ error, retry, errorId }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <div className="flex items-center">
      <AlertTriangle className="h-5 w-5 text-red-400" />
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">
          Component Error
        </h3>
        <p className="mt-1 text-sm text-red-700">
          This component failed to load. Please try again.
        </p>
        <div className="mt-2">
          <button
            onClick={retry}
            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const InlineErrorFallback = ({ error, retry }) => (
  <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded">
    <AlertTriangle className="h-4 w-4 mr-1" />
    Error loading component
    <button
      onClick={retry}
      className="ml-2 underline hover:no-underline"
    >
      Retry
    </button>
  </div>
);

// Hook for programmatic error reporting
export const useErrorHandler = () => {
  const reportError = (error, context = {}) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Manual Error Report:', errorReport);
    }

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.captureException(error, errorReport);
    }
  };

  return { reportError };
};

export default ErrorBoundary;