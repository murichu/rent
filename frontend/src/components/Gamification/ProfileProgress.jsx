import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ProfileProgress = ({ progress = 70 }) => {
  const tasks = [
    { id: 1, label: 'Add profile picture', completed: true, link: '/settings/profile' },
    { id: 2, label: 'Add company details', completed: true, link: '/settings/company' },
    { id: 3, label: 'Add payment method', completed: false, link: '/settings/billing' },
    { id: 4, label: 'Invite team member', completed: false, link: '/settings/team' },
    { id: 5, label: 'Enable 2FA', completed: false, link: '/settings/security' },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">Profile Completion</h3>
          <p className="text-blue-100 text-sm">Complete your profile to unlock all features</p>
        </div>
        <div className="text-4xl">👤</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>{completedCount}/{tasks.length} completed</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
          >
            <label className="flex items-center gap-3 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={task.completed}
                readOnly
                className="w-4 h-4 rounded"
              />
              <span className={task.completed ? 'line-through opacity-75' : ''}>
                {task.label}
              </span>
            </label>
            {!task.completed && (
              <Link
                to={task.link}
                className="px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Complete
              </Link>
            )}
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-4 p-3 bg-white/20 rounded-lg text-center">
          <span className="text-lg">🎉</span>
          <p className="font-medium">Profile Complete! You're all set!</p>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileProgress;
