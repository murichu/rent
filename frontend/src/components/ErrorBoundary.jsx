import React from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

/**
 * Base Error Boundary Component
 * Provides graceful error handling with fallback UI
 */
class BaseErrorBoundary extends React.Component {
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
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // Report error to logging service
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    try {
      // Create error report
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        level: this.props.level || "component",
        component: this.props.componentName || "Unknown",
      };

      // Send to backend logging service
      this.sendErrorReport(errorReport);

      // Store in localStorage for offline scenarios
      this.storeErrorLocally(errorReport);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  sendErrorReport = async (errorReport) => {
    try {
      // Import axios dynamically to avoid circular dependencies
      const { apiClient } = await import("../config/api");

      await apiClient.post("/errors/frontend", {
        type: "frontend_error",
        ...errorReport,
      });
    } catch (error) {
      console.warn("Failed to send error report to backend:", error.message);
    }
  };

  storeErrorLocally = (errorReport) => {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("frontend_errors") || "[]"
      );
      existingErrors.push(errorReport);

      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem("frontend_errors", JSON.stringify(recentErrors));
    } catch (error) {
      console.warn("Failed to store error locally:", error.message);
    }
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.handleRetry,
          this.state.errorId
        );
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  renderDefaultFallback() {
    const { level = "component", title, description } = this.props;
    const { error, errorId, retryCount } = this.state;

    const errorTitle = title || this.getDefaultTitle(level);
    const errorDescription = description || this.getDefaultDescription(level);

    return (
      <div className="error-boundary-container">
        <div className={`error-boundary ${level}`}>
          <div className="error-icon">
            <AlertTriangle size={48} className="text-red-500" />
          </div>

          <div className="error-content">
            <h2 className="error-title">{errorTitle}</h2>
            <p className="error-description">{errorDescription}</p>

            {process.env.NODE_ENV === "development" && error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </details>
            )}

            <div className="error-id">
              Error ID: <code>{errorId}</code>
            </div>

            {retryCount > 0 && (
              <div className="retry-info">Retry attempts: {retryCount}</div>
            )}
          </div>

          <div className="error-actions">{this.renderActions(level)}</div>
        </div>

        <style jsx>{`
          .error-boundary-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: ${level === "app" ? "100vh" : "300px"};
            padding: 20px;
            background-color: ${level === "app" ? "#f8f9fa" : "transparent"};
          }

          .error-boundary {
            max-width: 600px;
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
          }

          .error-boundary.app {
            border: 2px solid #ef4444;
          }

          .error-boundary.page {
            border: 2px solid #f59e0b;
          }

          .error-boundary.component {
            border: 2px solid #6b7280;
          }

          .error-icon {
            margin-bottom: 24px;
          }

          .error-title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
          }

          .error-description {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 24px;
            line-height: 1.5;
          }

          .error-details {
            text-align: left;
            margin: 20px 0;
            padding: 16px;
            background: #f3f4f6;
            border-radius: 8px;
            border: 1px solid #d1d5db;
          }

          .error-details summary {
            cursor: pointer;
            font-weight: 500;
            color: #374151;
            margin-bottom: 12px;
          }

          .error-stack {
            font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
            font-size: 12px;
            color: #ef4444;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
          }

          .error-id {
            font-size: 12px;
            color: #9ca3af;
            margin: 16px 0;
          }

          .error-id code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }

          .retry-info {
            font-size: 12px;
            color: #f59e0b;
            margin-bottom: 16px;
          }

          .error-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .error-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 14px;
          }

          .error-button.primary {
            background: #3b82f6;
            color: white;
          }

          .error-button.primary:hover {
            background: #2563eb;
          }

          .error-button.secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .error-button.secondary:hover {
            background: #e5e7eb;
          }

          .error-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  getDefaultTitle(level) {
    switch (level) {
      case "app":
        return "Application Error";
      case "page":
        return "Page Error";
      case "component":
        return "Component Error";
      default:
        return "Something went wrong";
    }
  }

  getDefaultDescription(level) {
    switch (level) {
      case "app":
        return "The application encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.";
      case "page":
        return "This page encountered an error while loading. You can try refreshing or navigate to a different page.";
      case "component":
        return "A component on this page failed to load properly. The rest of the page should still work normally.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  renderActions(level) {
    const actions = [];

    // Always show retry button
    actions.push(
      <button
        key="retry"
        className="error-button primary"
        onClick={this.handleRetry}
        disabled={this.state.retryCount >= 3}
      >
        <RefreshCw size={16} />
        {this.state.retryCount >= 3 ? "Max retries reached" : "Try Again"}
      </button>
    );

    // Show navigation options based on level
    if (level === "app" || level === "page") {
      actions.push(
        <button
          key="home"
          className="error-button secondary"
          onClick={this.handleGoHome}
        >
          <Home size={16} />
          Go Home
        </button>
      );
    }

    if (level === "page") {
      actions.push(
        <button
          key="back"
          className="error-button secondary"
          onClick={this.handleGoBack}
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      );
    }

    return actions;
  }
}

/**
 * App-level Error Boundary
 * Catches errors that bubble up from the entire application
 */
export class AppErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        level="app"
        componentName="App"
        title="Application Error"
        description="The application encountered a critical error. Please refresh the page or contact support."
        {...this.props}
      />
    );
  }
}

/**
 * Page-level Error Boundary
 * Catches errors within specific pages/routes
 */
export class PageErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        level="page"
        componentName={this.props.pageName || "Page"}
        title={`${this.props.pageName || "Page"} Error`}
        description="This page encountered an error. You can try refreshing or navigate to a different page."
        {...this.props}
      />
    );
  }
}

/**
 * Component-level Error Boundary
 * Catches errors within specific components
 */
export class ComponentErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        level="component"
        componentName={this.props.componentName || "Component"}
        title="Component Error"
        description="A component failed to load. The rest of the page should work normally."
        {...this.props}
      />
    );
  }
}

/**
 * HOC for wrapping components with error boundaries
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <ComponentErrorBoundary
      componentName={Component.displayName || Component.name}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </ComponentErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}

/**
 * Hook for error reporting from functional components
 */
export function useErrorHandler() {
  const reportError = React.useCallback((error, errorInfo = {}) => {
    try {
      const errorReport = {
        message: error.message || String(error),
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        component: errorInfo.component || "Unknown",
        ...errorInfo,
      };

      // Store locally
      const existingErrors = JSON.parse(
        localStorage.getItem("frontend_errors") || "[]"
      );
      existingErrors.push(errorReport);
      localStorage.setItem(
        "frontend_errors",
        JSON.stringify(existingErrors.slice(-10))
      );

      // Send to backend
      import("../config/api").then(({ apiClient }) => {
        apiClient
          .post("/errors/frontend", {
            type: "frontend_error",
            ...errorReport,
          })
          .catch((err) => {
            console.warn("Failed to send error report:", err.message);
          });
      });
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }, []);

  return { reportError };
}

export default BaseErrorBoundary;
