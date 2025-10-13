import React from 'react';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const leaders = [
    { rank: 1, name: 'Sarah Johnson', points: 5420, avatar: '👩', change: 'up', properties: 15 },
    { rank: 2, name: 'Michael Chen', points: 4890, avatar: '👨', change: 'up', properties: 12 },
    { rank: 3, name: 'Emily Rodriguez', points: 4560, avatar: '👩', change: 'down', properties: 10 },
    { rank: 4, name: 'David Kim', points: 4230, avatar: '👨', change: 'same', properties: 11 },
    { rank: 5, name: 'You', points: 3890, avatar: '⭐', change: 'up', properties: 8, isCurrentUser: true },
  ];

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getTrendIcon = (change) => {
    if (change === 'up') return '📈';
    if (change === 'down') return '📉';
    return '➡️';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white">
        <h2 className="text-2xl font-bold mb-1">🏆 Leaderboard</h2>
        <p className="text-yellow-100">Top property managers this month</p>
      </div>

      {/* Leaderboard List */}
      <div className="p-6">
        <div className="space-y-3">
          {leaders.map((leader, index) => (
            <motion.div
              key={leader.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                leader.isCurrentUser
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 shadow-md'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {/* Rank */}
              <div className="text-2xl font-bold w-12 text-center">
                {getRankIcon(leader.rank)}
              </div>

              {/* Avatar */}
              <div className="text-4xl">{leader.avatar}</div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {leader.name}
                  </h3>
                  {leader.isCurrentUser && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {leader.properties} properties managed
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {leader.points.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span>{getTrendIcon(leader.change)}</span>
                  points
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Your Rank Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">You're in the</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Top 25%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Next rank in</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">340 pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
