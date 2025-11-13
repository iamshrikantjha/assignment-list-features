/**
 * @file setupTestEnv.ts
 * @description Global Jest setup executed before every test file.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { logger } from '../utils/logger';
import { buildApp } from '../app';

// Increase the default timeout for MongoDB downloads in constrained CI environments.
jest.setTimeout(60_000);

let mongoServer: MongoMemoryServer;
let appInstance: ReturnType<typeof buildApp>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  process.env.REQUEST_LOG_LEVEL = 'silent';

  await mongoose.connect(mongoUri);
  appInstance = buildApp();
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

export const getApp = (): ReturnType<typeof buildApp> => {
  if (!appInstance) {
    throw new Error('Test app not initialised yet');
  }
  return appInstance;
};

// Silence logger output during tests to keep console clean.
logger.level = 'silent';

