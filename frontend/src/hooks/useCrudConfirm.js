import { useCallback } from 'react';
import { useConfirm } from './useConfirm';

/**
 * Hook for CRUD operation confirmations
 * Provides pre-configured confirmations for Create, Update, Delete operations
 */
export const useCrudConfirm = () => {
  const { confirm } = useConfirm();

  /**
   * Confirm before creating a new item
   */
  const confirmCreate = useCallback(async (itemType, onConfirm, details = null) => {
    return await confirm({
      title: `Create ${itemType}?`,
      message: `Are you sure you want to create this ${itemType.toLowerCase()}?`,
      type: 'info',
      confirmText: 'Create',
      requireTyping: false,
      details: details,
      onConfirm,
    });
  }, [confirm]);

  /**
   * Confirm before updating an item
   */
  const confirmUpdate = useCallback(async (itemType, onConfirm, details = null) => {
    return await confirm({
      title: `Update ${itemType}?`,
      message: `Are you sure you want to save these changes?`,
      type: 'warning',
      confirmText: 'Save Changes',
      requireTyping: false,
      details: details,
      onConfirm,
    });
  }, [confirm]);

  /**
   * Confirm before deleting an item
   */
  const confirmDelete = useCallback(async (itemType, itemName, onConfirm, details = null, requireTyping = true) => {
    return await confirm({
      title: `Delete ${itemType}?`,
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      requireTyping: requireTyping,
      typeText: 'DELETE',
      details: details || [
        'This will permanently delete this item',
        'All associated data will be removed',
        'This action cannot be reversed',
      ],
      onConfirm,
    });
  }, [confirm]);

  /**
   * Confirm before any action
   */
  const confirmAction = useCallback(async (title, message, onConfirm, options = {}) => {
    return await confirm({
      title,
      message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Confirm',
      requireTyping: options.requireTyping || false,
      typeText: options.typeText || 'CONFIRM',
      details: options.details,
      onConfirm,
    });
  }, [confirm]);

  /**
   * Confirm bulk delete
   */
  const confirmBulkDelete = useCallback(async (itemType, count, onConfirm) => {
    return await confirm({
      title: `Delete ${count} ${itemType}s?`,
      message: `You are about to delete ${count} ${itemType.toLowerCase()}s. This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete All',
      requireTyping: true,
      typeText: 'DELETE',
      details: [
        `${count} items will be permanently deleted`,
        'All associated data will be removed',
        'This action cannot be reversed',
      ],
      onConfirm,
    });
  }, [confirm]);

  /**
   * Confirm before submitting a form
   */
  const confirmSubmit = useCallback(async (formName, onConfirm, details = null) => {
    return await confirm({
      title: `Submit ${formName}?`,
      message: 'Please review your information before submitting.',
      type: 'info',
      confirmText: 'Submit',
      requireTyping: false,
      details: details,
      onConfirm,
    });
  }, [confirm]);

  return {
    confirmCreate,
    confirmUpdate,
    confirmDelete,
    confirmAction,
    confirmBulkDelete,
    confirmSubmit,
  };
};

export default useCrudConfirm;
