import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/scripts/'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTestEnv.ts'],
  clearMocks: true,
  detectOpenHandles: true,
  testTimeout: 30000
};

export default config;

