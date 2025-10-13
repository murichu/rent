import React from 'react';
import { motion } from 'framer-motion';

const HavenLogo = ({ size = 'md', showText = true, animated = false }) => {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
    xl: { icon: 64, text: 'text-4xl' },
  };

  const { icon, text } = sizes[size];

  const LogoIcon = () => (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* House shape */}
      <path
        d="M50 15L85 40V80C85 82.7614 82.7614 85 80 85H20C17.2386 85 15 82.7614 15 80V40L50 15Z"
        fill="url(#gradient1)"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Door */}
      <rect
        x="40"
        y="55"
        width="20"
        height="30"
        rx="2"
        fill="currentColor"
        opacity="0.2"
      />
      {/* Windows */}
      <rect x="25" y="45" width="12" height="12" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="63" y="45" width="12" height="12" rx="1" fill="currentColor" opacity="0.3" />
      {/* Roof accent */}
      <path
        d="M50 15L50 25"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="gradient1" x1="15" y1="15" x2="85" y2="85">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );

  const AnimatedLogo = () => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.div
        animate={animated ? { y: [0, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <LogoIcon />
      </motion.div>
    </motion.div>
  );

  return (
    <div className="flex items-center gap-3">
      {animated ? <AnimatedLogo /> : <LogoIcon />}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${text} text-gray-900 dark:text-white leading-tight`}>
            Haven
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Property Management System
          </span>
        </div>
      )}
    </div>
  );
};

export default HavenLogo;
