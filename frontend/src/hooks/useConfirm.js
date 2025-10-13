import { useState, useCallback } from 'react';

/**
 * Hook for managing confirmation dialogs
 */
export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger',
    requireTyping: false,
    typeText: 'DELETE',
    details: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        type: options.type || 'danger',
        requireTyping: options.requireTyping || false,
        typeText: options.typeText || 'DELETE',
        details: options.details || null,
        onConfirm: async () => {
          try {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve(true);
          } catch (error) {
            console.error('Confirmation failed:', error);
            resolve(false);
          } finally {
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
        },
      });
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmState,
    confirm,
    closeConfirm,
  };
};

export default useConfirm;
