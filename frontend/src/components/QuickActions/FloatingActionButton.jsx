import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      icon: '🏢',
      label: 'Add Property',
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => navigate('/properties/new'),
    },
    {
      icon: '👤',
      label: 'Add Tenant',
      color: 'bg-green-600 hover:bg-green-700',
      action: () => navigate('/tenants/new'),
    },
    {
      icon: '📋',
      label: 'Create Lease',
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => navigate('/leases/new'),
    },
    {
      icon: '💰',
      label: 'Record Payment',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      action: () => navigate('/payments/new'),
    },
  ];

  const handleActionClick = (action) => {
    setIsOpen(false);
    setTimeout(() => action(), 200);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 md:hidden">
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActionClick(action.action)}
                className={`${action.color} text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3 min-w-max`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 -z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionButton;
