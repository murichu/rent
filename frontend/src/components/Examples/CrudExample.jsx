import React, { useState } from 'react';
import { useCrudConfirm } from '../../hooks/useCrudConfirm';
import CrudButtons from '../Common/CrudButtons';
import showToast from '../../utils/toast';
import ConfirmDialog from '../Dialogs/ConfirmDialog';
import { useConfirm } from '../../hooks/useConfirm';

/**
 * Example: How to use CRUD confirmations in your components
 */
const CrudExample = () => {
  const { 
    confirmCreate, 
    confirmUpdate, 
    confirmDelete, 
    confirmBulkDelete 
  } = useCrudConfirm();
  const { confirmState, closeConfirm } = useConfirm();

  const [items, setItems] = useState([
    { id: 1, name: 'Property A', type: 'Apartment' },
    { id: 2, name: 'Property B', type: 'House' },
    { id: 3, name: 'Property C', type: 'Condo' },
  ]);

  // CREATE with confirmation
  const handleCreate = async () => {
    await confirmCreate(
      'Property',
      async () => {
        // Your create logic here
        const newItem = { id: Date.now(), name: 'New Property', type: 'Apartment' };
        setItems([...items, newItem]);
        showToast.success('Property created successfully!');
      },
      ['This will add a new property to your portfolio']
    );
  };

  // UPDATE with confirmation
  const handleUpdate = async (item) => {
    await confirmUpdate(
      'Property',
      async () => {
        // Your update logic here
        showToast.success(`${item.name} updated successfully!`);
      },
      ['Changes will be saved immediately', 'Previous data will be replaced']
    );
  };

  // DELETE with confirmation
  const handleDelete = async (item) => {
    await confirmDelete(
      'Property',
      item.name,
      async () => {
        // Your delete logic here
        setItems(items.filter((i) => i.id !== item.id));
        
        // Show undo option
        showToast.undo(`${item.name} deleted`, () => {
          setItems([...items, item]);
          showToast.success('Property restored!');
        });
      },
      [
        '3 active leases will be affected',
        '12 payment records will be removed',
        'All tenant data will be lost',
      ],
      true // Require typing "DELETE"
    );
  };

  // BULK DELETE with confirmation
  const handleBulkDelete = async (selectedItems) => {
    await confirmBulkDelete(
      'Property',
      selectedItems.length,
      async () => {
        // Your bulk delete logic here
        const ids = selectedItems.map((i) => i.id);
        setItems(items.filter((i) => !ids.includes(i.id)));
        showToast.success(`${selectedItems.length} properties deleted!`);
      }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        CRUD Operations with Confirmations
      </h1>

      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Property
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.type}</p>
            </div>

            {/* Using CrudButtons component */}
            <CrudButtons
              onEdit={() => handleUpdate(item)}
              onDelete={() => handleDelete(item)}
              itemType="Property"
              itemName={item.name}
              deleteDetails={[
                '3 active leases will be affected',
                '12 payment records will be removed',
              ]}
            />
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      {items.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => handleBulkDelete(items)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete All ({items.length})
          </button>
        </div>
      )}

      {/* Confirmation Dialog (managed by useCrudConfirm) */}
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
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />
    </div>
  );
};

export default CrudExample;
