// Jest setup file
// This runs before each test file

import { resetMockDB } from './firestore';

// Reset mock database before each test
beforeEach(() => {
  resetMockDB();
  jest.clearAllMocks();
});
