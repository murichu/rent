export default {
  // Test environment
  testEnvironment: 'node',
  
  // Module type
  preset: null,
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Transform configuration
  transform: {},
  
  // Test file patterns
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/src/**/__tests__/**/*.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/**/*.test.js',
    '!src/server.js',
    '!src/db.js'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Maximum worker processes
  maxWorkers: 1,
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};