import { createRoot } from "react-dom/client";
import React from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { ToastTypes, ToastSeverity } from "./toastConstants.js";

/**
 * Toast Configuration
 */
const ToastConfig = {
  [ToastTypes.SUCCESS]: {
    icon: CheckCircle,
    className: "toast-success",
    defaultDuration: 4000,
    color: "#10b981",
  },
  [ToastTypes.ERROR]: {
    icon: AlertCircle,
    className: "toast-error",
    defaultDuration: 8000,
    color: "#ef4444",
  },
  [ToastTypes.WARNING]: {
    icon: AlertTriangle,
    className: "toast-warning",
    defaultDuration: 6000,
    color: "#f59e0b",
  },
  [ToastTypes.INFO]: {
    icon: Info,
    className: "toast-info",
    defaultDuration: 5000,
    color: "#3b82f6",
  },
};

/**
 * Toast Component
 */
const Toast = ({
  id,
  type,
  title,
  message,
  duration,
  actions,
  onClose,
  onAction,
  severity,
  correlationId,
}) => {
  const config = ToastConfig[type] || ToastConfig[ToastTypes.INFO];
  const IconComponent = config.icon;

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const handleAction = (action) => {
    if (onAction) {
      onAction(action, id);
    }
    if (action.closeOnClick !== false) {
      onClose(id);
    }
  };

  const toastStyles = {
    display: "flex",
    alignItems: "flex-start",
    padding: "16px",
    marginBottom: "12px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    borderLeft: `${
      severity === "critical" ? "6px" : severity === "high" ? "5px" : "4px"
    } solid ${config.color}`,
    maxWidth: "400px",
    minWidth: "300px",
    position: "relative",
    overflow: "hidden",
    animation: "slideIn 0.3s ease-out",
    ...(severity === "critical" && {
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.3)",
    }),
  };

  const contentStyles = {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
    gap: "12px",
  };

  const iconStyles = {
    color: config.color,
    flexShrink: 0,
    marginTop: "2px",
  };

  const bodyStyles = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyles = {
    fontWeight: 600,
    fontSize: "14px",
    color: "#1f2937",
    marginBottom: "4px",
  };

  const messageStyles = {
    fontSize: "14px",
    color: "#4b5563",
    lineHeight: 1.4,
    wordWrap: "break-word",
  };

  const correlationStyles = {
    fontSize: "10px",
    color: "#9ca3af",
    marginTop: "4px",
    fontFamily: "monospace",
  };

  const actionsStyles = {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  };

  const getActionStyles = (variant) => ({
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    border: variant === "secondary" ? "1px solid #d1d5db" : "none",
    background: variant === "secondary" ? "#f3f4f6" : config.color,
    color: variant === "secondary" ? "#374151" : "white",
    transition: "all 0.2s",
  });

  const closeStyles = {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    flexShrink: 0,
    transition: "all 0.2s",
  };

  return (
    <div style={toastStyles}>
      <div style={contentStyles}>
        <div style={iconStyles}>
          <IconComponent size={20} />
        </div>

        <div style={bodyStyles}>
          {title && <div style={titleStyles}>{title}</div>}
          <div style={messageStyles}>{message}</div>

          {correlationId && process.env.NODE_ENV === "development" && (
            <div style={correlationStyles}>ID: {correlationId}</div>
          )}

          {actions && actions.length > 0 && (
            <div style={actionsStyles}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  style={getActionStyles(action.variant || "primary")}
                  onClick={() => handleAction(action)}
                  onMouseEnter={(e) => {
                    if (action.variant === "secondary") {
                      e.target.style.background = "#e5e7eb";
                    } else {
                      e.target.style.opacity = "0.9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (action.variant === "secondary") {
                      e.target.style.background = "#f3f4f6";
                    } else {
                      e.target.style.opacity = "1";
                    }
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          style={closeStyles}
          onClick={() => onClose(id)}
          aria-label="Close notification"
          onMouseEnter={(e) => {
            e.target.style.background = "#f3f4f6";
            e.target.style.color = "#6b7280";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "none";
            e.target.style.color = "#9ca3af";
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * Toast Container Component
 */
const ToastContainer = ({ toasts, onClose, onAction }) => {
  const containerStyles = {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    pointerEvents: "none",
  };

  // Add media query styles for mobile
  const isMobile = window.innerWidth <= 640;
  if (isMobile) {
    containerStyles.top = "10px";
    containerStyles.right = "10px";
    containerStyles.left = "10px";
  }

  return (
    <div style={containerStyles}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <Toast {...toast} onClose={onClose} onAction={onAction} />
        </div>
      ))}
    </div>
  );
};

/**
 * Toast Service Class
 */
class ToastService {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.root = null;
    this.listeners = [];
    this.maxToasts = 5;
    this.init();
  }

  init() {
    // Add CSS animations to document head
    this.addStyles();

    // Create container element
    this.container = document.createElement("div");
    this.container.id = "toast-container";
    document.body.appendChild(this.container);

    // Create React root
    this.root = createRoot(this.container);
    this.render();
  }

  addStyles() {
    if (document.getElementById("toast-styles")) return;

    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .toast-removing {
        animation: slideOut 0.3s ease-in forwards !important;
      }
    `;
    document.head.appendChild(style);
  }

  render() {
    this.root.render(
      React.createElement(ToastContainer, {
        toasts: this.toasts,
        onClose: this.close.bind(this),
        onAction: this.handleAction.bind(this),
      })
    );
  }

  /**
   * Add a new toast notification
   */
  show(options) {
    const toast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: options.type || ToastTypes.INFO,
      title: options.title,
      message: options.message || "",
      duration:
        options.duration !== undefined
          ? options.duration
          : ToastConfig[options.type || ToastTypes.INFO].defaultDuration,
      actions: options.actions || [],
      severity: options.severity || ToastSeverity.MEDIUM,
      correlationId: options.correlationId,
      timestamp: new Date().toISOString(),
    };

    // Remove oldest toast if we've reached the limit
    if (this.toasts.length >= this.maxToasts) {
      this.toasts.shift();
    }

    this.toasts.push(toast);
    this.render();
    this.notifyListeners("show", toast);

    return toast.id;
  }

  /**
   * Close a specific toast
   */
  close(id) {
    const toastIndex = this.toasts.findIndex((toast) => toast.id === id);
    if (toastIndex > -1) {
      const toast = this.toasts[toastIndex];
      this.toasts.splice(toastIndex, 1);
      this.render();
      this.notifyListeners("close", toast);
    }
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.toasts = [];
    this.render();
    this.notifyListeners("clear");
  }

  /**
   * Handle toast action clicks
   */
  handleAction(action, toastId) {
    const toast = this.toasts.find((t) => t.id === toastId);
    if (toast && action.handler) {
      try {
        action.handler(toast);
      } catch (error) {
        console.error("Toast action handler error:", error);
      }
    }
    this.notifyListeners("action", { action, toastId });
  }

  /**
   * Success toast
   */
  success(message, options = {}) {
    return this.show({
      type: ToastTypes.SUCCESS,
      message,
      ...options,
    });
  }

  /**
   * Error toast with enhanced options
   */
  error(message, options = {}) {
    const errorOptions = {
      type: ToastTypes.ERROR,
      message,
      severity: ToastSeverity.HIGH,
      duration: 0, // Don't auto-dismiss errors
      ...options,
    };

    // Add retry action for recoverable errors
    if (options.retryable && options.onRetry) {
      errorOptions.actions = [
        {
          label: "Retry",
          variant: "primary",
          handler: options.onRetry,
        },
        ...(errorOptions.actions || []),
      ];
    }

    // Add report action for unexpected errors
    if (options.reportable !== false) {
      errorOptions.actions = [
        ...(errorOptions.actions || []),
        {
          label: "Report",
          variant: "secondary",
          handler: (toast) => this.reportError(toast, options.errorDetails),
        },
      ];
    }

    return this.show(errorOptions);
  }

  /**
   * Warning toast
   */
  warning(message, options = {}) {
    return this.show({
      type: ToastTypes.WARNING,
      message,
      severity: ToastSeverity.MEDIUM,
      ...options,
    });
  }

  /**
   * Info toast
   */
  info(message, options = {}) {
    return this.show({
      type: ToastTypes.INFO,
      message,
      ...options,
    });
  }

  /**
   * Show error from API response
   */
  showApiError(error, options = {}) {
    let message = "An unexpected error occurred";
    let title = "Error";
    let correlationId = null;

    if (error.response) {
      // API error response
      const data = error.response.data;
      message = data.error || data.message || message;
      correlationId = data.correlationId;

      if (error.response.status === 401) {
        title = "Authentication Required";
        message = "Please log in to continue";
      } else if (error.response.status === 403) {
        title = "Access Denied";
        message = "You don't have permission to perform this action";
      } else if (error.response.status === 429) {
        title = "Rate Limited";
        message = data.error || "Too many requests. Please try again later.";
      } else if (error.response.status >= 500) {
        title = "Server Error";
        message = "The server encountered an error. Please try again.";
      }
    } else if (error.request) {
      // Network error
      title = "Network Error";
      message =
        "Unable to connect to the server. Please check your connection.";
    } else {
      // Other error
      message = error.message || message;
    }

    return this.error(message, {
      title,
      correlationId,
      retryable: error.response?.status >= 500 || !error.response,
      errorDetails: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
      },
      ...options,
    });
  }

  /**
   * Report error to backend
   */
  async reportError(toast, errorDetails = {}) {
    try {
      const { default: apiClient } = await import("../lib/axios");

      await apiClient.post("/errors/frontend", {
        type: "user_reported_error",
        message: toast.message,
        title: toast.title,
        correlationId: toast.correlationId,
        timestamp: toast.timestamp,
        errorDetails,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      this.success("Error report sent successfully");
    } catch (reportError) {
      console.error("Failed to report error:", reportError);
      this.warning("Failed to send error report");
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    this.listeners = this.listeners.filter(
      (listener) => listener.event !== event || listener.callback !== callback
    );
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners
      .filter((listener) => listener.event === event)
      .forEach((listener) => {
        try {
          listener.callback(data);
        } catch (error) {
          console.error("Toast listener error:", error);
        }
      });
  }

  /**
   * Get current toasts
   */
  getToasts() {
    return [...this.toasts];
  }

  /**
   * Update toast configuration
   */
  configure(options) {
    if (options.maxToasts) {
      this.maxToasts = options.maxToasts;
    }
  }

  /**
   * Destroy the service
   */
  destroy() {
    this.clear();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.listeners = [];
  }
}

// Create singleton instance
const toastService = new ToastService();

// Export service instance as default
export default toastService;
