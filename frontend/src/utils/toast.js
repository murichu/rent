import toast from 'react-hot-toast';

/**
 * Toast notification utilities
 */

const defaultOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    background: '#333',
    color: '#fff',
  },
};

export const showToast = {
  /**
   * Success toast
   */
  success: (message, options = {}) => {
    toast.success(message, {
      ...defaultOptions,
      icon: '✅',
      ...options,
    });
  },

  /**
   * Error toast
   */
  error: (message, options = {}) => {
    toast.error(message, {
      ...defaultOptions,
      icon: '❌',
      duration: 5000,
      ...options,
    });
  },

  /**
   * Warning toast
   */
  warning: (message, options = {}) => {
    toast(message, {
      ...defaultOptions,
      icon: '⚠️',
      style: {
        ...defaultOptions.style,
        background: '#f59e0b',
      },
      ...options,
    });
  },

  /**
   * Info toast
   */
  info: (message, options = {}) => {
    toast(message, {
      ...defaultOptions,
      icon: 'ℹ️',
      style: {
        ...defaultOptions.style,
        background: '#3b82f6',
      },
      ...options,
    });
  },

  /**
   * Loading toast
   */
  loading: (message, options = {}) => {
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Promise toast
   */
  promise: (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred',
      },
      {
        ...defaultOptions,
        ...options,
      }
    );
  },

  /**
   * Custom toast
   */
  custom: (component, options = {}) => {
    toast.custom(component, {
      ...defaultOptions,
      ...options,
    });
  },

  /**
   * Toast with action button
   */
  withAction: (message, actionLabel, actionHandler, options = {}) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                actionHandler();
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      ),
      {
        duration: 6000,
        ...options,
      }
    );
  },

  /**
   * Undo toast
   */
  undo: (message, undoHandler, options = {}) => {
    return showToast.withAction(message, 'Undo', undoHandler, {
      duration: 5000,
      ...options,
    });
  },

  /**
   * Dismiss specific toast
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

export default showToast;
