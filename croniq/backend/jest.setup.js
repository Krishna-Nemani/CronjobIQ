// jest.setup.js

// Set NODE_ENV to 'test' if it's not already set by Jest
process.env.NODE_ENV = 'test';

// You can add global setup here, for example:
// - Mocking global modules (like a logger)
// - Setting up environment variables specific to tests
// - Initializing a test database connection if not handled per-suite

// Example: Load environment variables from a .env.test file if you have one
// require('dotenv').config({ path: '.env.test' });

// console.log('Global Jest setup file loaded. NODE_ENV:', process.env.NODE_ENV);
