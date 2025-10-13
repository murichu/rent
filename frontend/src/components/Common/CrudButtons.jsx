import React from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import { useCrudConfirm } from '../../hooks/useCrudConfirm';
import ConfirmDialog from '../Dialogs/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';

/**
 * Standard CRUD action buttons with built-in confirmations
 */
const CrudButtons = ({
  onEdit,
  onDelete,
  onView,
  itemType = 'item',
  itemName = '',
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  viewLabel = 'View',
  showEdit = true,
  showDelete = true,
  showView = false,
  size = 'md',
  layout = 'horizontal', // 'horizontal' or 'vertical'
  deleteDetails = null,
}) => {
  const { confirmDelete } = useCrudConfirm();
  const { confirmState, closeConfirm } = useConfirm();

  const handleDelete = async () => {
    if (onDelete) {
      await confirmDelete(itemType, itemName, onDelete, deleteDetails);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerClass = layout === 'vertical' ? 'flex flex-col gap-2' : 'flex gap-2';

  return (
    <>
      <div className={containerClass}>
        {showView && onView && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onView}
            className={`${sizeClasses[size]} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors`}
            aria-label={viewLabel}
            title={viewLabel}
          >
            <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </motion.button>
        )}

        {showEdit && onEdit && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEdit}
            className={`${sizeClasses[size]} text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors`}
            aria-label={editLabel}
            title={editLabel}
          >
            <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </motion.button>
        )}

        {showDelete && onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className={`${sizeClasses[size]} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors`}
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        requireTyping={confirmState.requireTyping}
        typeText={confirmState.typeText}
        details={confirmState.details}
      />
    </>
  );
};

export default CrudButtons;
