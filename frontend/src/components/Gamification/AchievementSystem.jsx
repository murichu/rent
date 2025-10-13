import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AchievementSystem = ({ userId }) => {
  const [achievements, setAchievements] = useState([
    {
      id: 1,
      title: 'First Property',
      description: 'Add your first property',
      icon: '🏠',
      earned: true,
      earnedAt: new Date('2024-01-15'),
      points: 100,
      rarity: 'common',
    },
    {
      id: 2,
      title: 'Property Master',
      description: 'Manage 10+ properties',
      icon: '🏢',
      earned: true,
      earnedAt: new Date('2024-02-20'),
      points: 250,
      rarity: 'rare',
    },
    {
      id: 3,
      title: 'Perfect Collection',
      description: '100% on-time payment rate for a month',
      icon: '💯',
      earned: true,
      earnedAt: new Date('2024-03-01'),
      points: 500,
      rarity: 'epic',
    },
    {
      id: 4,
      title: 'Zero Vacancies',
      description: 'Achieve 100% occupancy rate',
      icon: '🎯',
      earned: false,
      progress: 92,
      points: 300,
      rarity: 'rare',
    },
    {
      id: 5,
      title: 'Communication Pro',
      description: 'Send 100 messages to tenants',
      icon: '💬',
      earned: false,
      progress: 67,
      points: 150,
      rarity: 'common',
    },
    {
      id: 6,
      title: 'Year of Success',
      description: 'Manage properties for 1 year',
      icon: '🎂',
      earned: false,
      progress: 45,
      points: 1000,
      rarity: 'legendary',
    },
  ]);

  const [showCelebration, setShowCelebration] = useState(null);

  const rarityColors = {
    common: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300',
    rare: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300',
    epic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-300',
    legendary: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-300',
  };

  const totalPoints = achievements.reduce((sum, a) => sum + (a.earned ? a.points : 0), 0);
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100">Total Points</span>
            <span className="text-3xl">⭐</span>
          </div>
          <p className="text-4xl font-bold">{totalPoints.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100">Achievements</span>
            <span className="text-3xl">🏆</span>
          </div>
          <p className="text-4xl font-bold">
            {earnedCount}/{achievements.length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100">Completion</span>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-4xl font-bold">{Math.round((earnedCount / achievements.length) * 100)}%</p>
        </div>
      </div>

      {/* Achievements Grid */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative rounded-xl p-6 border-2 transition-all ${
                achievement.earned
                  ? `${rarityColors[achievement.rarity]} shadow-lg hover:shadow-xl`
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              {/* Rarity Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${rarityColors[achievement.rarity]}`}>
                  {achievement.rarity}
                </span>
              </div>

              {/* Icon */}
              <div className="text-5xl mb-3">{achievement.icon}</div>

              {/* Info */}
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">{achievement.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{achievement.description}</p>

              {/* Progress or Earned Date */}
              {achievement.earned ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">+{achievement.points} pts</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${achievement.progress}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{ duration: 0.6 }}
                className="text-9xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-2">Achievement Unlocked!</h2>
              <p className="text-xl text-white">{showCelebration.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementSystem;
