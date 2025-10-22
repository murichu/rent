export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/src/tests/**/*.spec.js'
  ],
  testTimeout: 60000, // 60 seconds for performance tests
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};