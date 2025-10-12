import React, { useState } from 'react';

/**
 * Bulk Actions Component
 * Provides bulk selection and actions for list items
 */
const BulkActions = ({ 
  items = [], 
  onDelete, 
  onExport, 
  onUpdate,
  renderItem,
  itemLabel = 'items'
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
      setIsAllSelected(true);
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setIsAllSelected(newSelected.size === items.length);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} ${itemLabel}?`)) {
      await onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsAllSelected(false);
    }
  };

  const handleBulkExport = () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    onExport(selectedItems);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div 
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between"
          role="region"
          aria-label="Bulk actions"
        >
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {selectedCount} {itemLabel} selected
            </span>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setIsAllSelected(false);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={handleBulkExport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                aria-label={`Export ${selectedCount} selected ${itemLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </button>
            )}

            {onUpdate && (
              <button
                onClick={() => setShowActions(!showActions)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                aria-label="Update selected items"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Update</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
                aria-label={`Delete ${selectedCount} selected ${itemLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items List with Checkboxes */}
      <div className="space-y-2">
        {/* Select All */}
        <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            aria-label="Select all items"
          />
          <span className="font-medium text-gray-900 dark:text-white">
            Select All ({items.length})
          </span>
        </label>

        {/* Individual Items */}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => handleSelectItem(item.id)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              aria-label={`Select ${item.name || item.title || item.id}`}
            />
            <div className="flex-1">
              {renderItem ? renderItem(item) : (
                <span className="text-gray-900 dark:text-white">
                  {item.name || item.title || item.id}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default BulkActions;
