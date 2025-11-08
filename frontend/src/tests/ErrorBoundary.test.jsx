import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { 
  AppErrorBoundary, 
  PageErrorBoundary, 
  ComponentErrorBoundary,
  withErrorBoundary,
  useErrorHandler 
} from '../components/ErrorBoundary';

// Mock the logging service
jest.mock('../services/loggingService', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Mock the axios client
jest.mock('../lib/axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({ data: { success: true } })
  }
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Component for testing useErrorHandler hook
const TestErrorHandler = () => {
  const { reportError } = useErrorHandler();
  
  const handleClick = () => {
    reportError(new Error('Manual error report'), { component: 'TestComponent' });
  };
  
  return <button onClick={handleClick}>Report Error</button>;
};

describe('Error Boundary Components', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('AppErrorBoundary', () => {
    test('should render children when no error occurs', () => {
      render(
        <AppErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AppErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('should render error UI when error occurs', () => {
      render(
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText(/application encountered an unexpected error/i)).toBeInTheDocument();
    });

    test('should show retry button', () => {
      render(
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    test('should show navigation buttons for app-level errors', () => {
      render(
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      );

      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    test('should retry when retry button is clicked', () => {
      const { rerender } = render(
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Re-render with no error to simulate successful retry
      rerender(
        <AppErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AppErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('PageErrorBoundary', () => {
    test('should render page-specific error message', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText('TestPage Error')).toBeInTheDocument();
      expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument();
    });

    test('should show page-specific navigation options', () => {
      render(
        <PageErrorBoundary pageName="TestPage">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText('Go Home')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });

  describe('ComponentErrorBoundary', () => {
    test('should render component-specific error message', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText(/component failed to load/i)).toBeInTheDocument();
    });

    test('should only show retry button for component errors', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
      expect(screen.queryByText('Go Back')).not.toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    test('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError, {
        componentName: 'WrappedTest'
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });

    test('should pass props to wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('useErrorHandler hook', () => {
    test('should provide reportError function', () => {
      render(<TestErrorHandler />);

      const button = screen.getByText('Report Error');
      expect(button).toBeInTheDocument();
    });

    test('should call reportError when button is clicked', () => {
      render(<TestErrorHandler />);

      const button = screen.getByText('Report Error');
      fireEvent.click(button);

      // The error should be stored in localStorage
      const storedErrors = JSON.parse(localStorage.getItem('frontend_errors') || '[]');
      expect(storedErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error ID Generation', () => {
    test('should generate unique error IDs', () => {
      const { rerender } = render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ComponentErrorBoundary>
      );

      const firstErrorId = screen.getByText(/Error ID:/).textContent;

      // Trigger a new error
      rerender(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ComponentErrorBoundary>
      );

      rerender(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ComponentErrorBoundary>
      );

      const secondErrorId = screen.getByText(/Error ID:/).textContent;
      expect(firstErrorId).not.toBe(secondErrorId);
    });
  });

  describe('Retry Limit', () => {
    test('should disable retry button after max retries', () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');

      // Click retry button multiple times
      for (let i = 0; i < 4; i++) {
        fireEvent.click(retryButton);
      }

      expect(screen.getByText('Max retries reached')).toBeInTheDocument();
      expect(screen.getByText('Max retries reached')).toBeDisabled();
    });
  });

  describe('Development vs Production', () => {
    test('should show error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Detailed error" />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    test('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Detailed error" />
        </ComponentErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });
});