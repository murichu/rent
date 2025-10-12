import React from 'react';

/**
 * Error Display Component
 * Shows error messages in a user-friendly format
 */
const ErrorDisplay = ({ 
  error, 
  title = 'Error', 
  onRetry = null,
  fullScreen = false 
}) => {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || error?.error || 'An unexpected error occurred';

  const content = (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            {title}
          </h3>
          <p className="text-red-700 mb-4">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * Inline Error Message
 */
export const InlineError = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="text-red-600 text-sm mt-1 flex items-center gap-1">
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </div>
  );
};

/**
 * Empty State Component
 */
export const EmptyState = ({ 
  title = 'No data found', 
  description = 'Get started by adding your first item',
  icon = '📭',
  action = null 
}) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;
