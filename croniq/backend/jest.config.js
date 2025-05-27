module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'], // Pattern for test files
  setupFilesAfterEnv: ['./jest.setup.js'] // Optional: for global setup
};
