/**** @type {import('tailwindcss').Config} ****/
module.exports = {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark mode colors
        dark: {
          bg: '#1a1a1a',
          card: '#2d2d2d',
          border: '#404040',
        }
      }
    },
  },
  plugins: [],
};
