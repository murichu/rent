import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const SetupChecklist = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [checklist, setChecklist] = useState([
    { id: 'profile', label: 'Complete your profile', completed: false, link: '/settings' },
    { id: 'property', label: 'Add your first property', completed: false, link: '/properties/new' },
    { id: 'tenant', label: 'Create tenant profile', completed: false, link: '/tenants/new' },
    { id: '2fa', label: 'Enable two-factor authentication', completed: false, link: '/settings/security' },
    { id: 'payment', label: 'Set up payment method', completed: false, link: '/settings/billing' },
  ]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;
  const isComplete = completedCount === checklist.length;

  const toggleItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  if (isComplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">Get Started with Property Manager</h3>
          <p className="text-blue-100 text-sm">
            Complete these steps to get the most out of your account
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>{completedCount} of {checklist.length} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* Checklist Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            {checklist.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 rounded border-2 border-white/50 checked:bg-white checked:border-white focus:ring-2 focus:ring-white/50"
                    />
                    <span className={`${item.completed ? 'line-through opacity-75' : ''}`}>
                      {item.label}
                    </span>
                  </label>
                  {!item.completed && item.link && (
                    <Link
                      to={item.link}
                      className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      Start
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SetupChecklist;
