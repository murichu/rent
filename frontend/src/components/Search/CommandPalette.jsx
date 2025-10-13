import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Toggle with Cmd/Ctrl + K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleAction = useCallback((action) => {
    setOpen(false);
    setSearch('');
    action();
  }, []);

  const commands = [
    // Navigation
    {
      group: 'Navigation',
      items: [
        {
          icon: '📊',
          label: 'Dashboard',
          shortcut: 'G then D',
          action: () => navigate('/dashboard'),
        },
        {
          icon: '🏢',
          label: 'Properties',
          shortcut: 'G then P',
          action: () => navigate('/properties'),
        },
        {
          icon: '👥',
          label: 'Tenants',
          shortcut: 'G then T',
          action: () => navigate('/tenants'),
        },
        {
          icon: '📋',
          label: 'Leases',
          shortcut: 'G then L',
          action: () => navigate('/leases'),
        },
        {
          icon: '💰',
          label: 'Payments',
          shortcut: 'G then $',
          action: () => navigate('/payments'),
        },
        {
          icon: '⚙️',
          label: 'Settings',
          shortcut: 'G then S',
          action: () => navigate('/settings'),
        },
      ],
    },
    // Actions
    {
      group: 'Actions',
      items: [
        {
          icon: '➕',
          label: 'Add Property',
          shortcut: 'Ctrl+Shift+P',
          action: () => navigate('/properties/new'),
        },
        {
          icon: '👤',
          label: 'Add Tenant',
          shortcut: 'Ctrl+Shift+T',
          action: () => navigate('/tenants/new'),
        },
        {
          icon: '📝',
          label: 'Create Lease',
          shortcut: 'Ctrl+Shift+L',
          action: () => navigate('/leases/new'),
        },
        {
          icon: '💵',
          label: 'Record Payment',
          shortcut: 'Ctrl+Shift+$',
          action: () => navigate('/payments/new'),
        },
      ],
    },
    // Quick Actions
    {
      group: 'Quick Actions',
      items: [
        {
          icon: '🔍',
          label: 'Search Properties',
          action: () => {
            navigate('/properties');
            setTimeout(() => {
              document.querySelector('input[type="search"]')?.focus();
            }, 100);
          },
        },
        {
          icon: '📤',
          label: 'Export Data',
          action: () => console.log('Export'),
        },
        {
          icon: '📥',
          label: 'Import Data',
          action: () => console.log('Import'),
        },
      ],
    },
    // Theme
    {
      group: 'Preferences',
      items: [
        {
          icon: '🌙',
          label: 'Toggle Dark Mode',
          shortcut: 'Ctrl+Shift+D',
          action: () => {
            document.documentElement.classList.toggle('dark');
          },
        },
      ],
    },
  ];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Open command palette"
        data-tour="command-palette"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search</span>
        <kbd className="px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Command Palette */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <Command
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                label="Command Menu"
              >
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Type a command or search..."
                    className="w-full py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  />
                  <kbd className="hidden sm:block px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                    ESC
                  </kbd>
                </div>

                <Command.List className="max-h-96 overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No results found.
                  </Command.Empty>

                  {commands.map((group) => (
                    <Command.Group
                      key={group.group}
                      heading={group.group}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:dark:text-gray-400"
                    >
                      {group.items.map((item, index) => (
                        <Command.Item
                          key={`${group.group}-${index}`}
                          onSelect={() => handleAction(item.action)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors aria-selected:bg-gray-100 aria-selected:dark:bg-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                              {item.label}
                            </span>
                          </div>
                          {item.shortcut && (
                            <kbd className="hidden sm:block px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>

                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">ESC</kbd>
                      Close
                    </span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommandPalette;
