module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['src/services/**/*.ts', 'src/utils/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/firebase.ts'],
  moduleNameMapper: {
    '^firebase/firestore$': '<rootDir>/src/services/__mocks__/firestore.ts',
    '^firebase/app$': '<rootDir>/src/services/__mocks__/firebaseApp.ts',
    '^firebase/auth$': '<rootDir>/src/services/__mocks__/firebaseAuth.ts',
    '^./firebase$': '<rootDir>/src/services/__mocks__/firebase.ts',
    '^../firebase$': '<rootDir>/src/services/__mocks__/firebase.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/services/__mocks__/setup.ts'],
};
