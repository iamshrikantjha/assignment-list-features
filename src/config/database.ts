/**
 * @file database.ts
 * @description Centralised MongoDB connection bootstrapper with resilience smarts.
 * The comments are intentionally verbose per the user's request for human-friendly documentation.
 */

import mongoose from 'mongoose';

import { logger } from '../utils/logger';

/**
 * Cached instance of the active Mongoose connection.
 * We keep it in module scope to avoid duplicate connections during hot reloads in dev and tests.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connects to MongoDB using the connection string provided via environment variables.
 * Includes sensible defaults for production use while remaining test friendly.
 */
export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Unable to initialise database.');
  }

  connectionPromise = mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5_000,
    bufferCommands: false
  });

  connectionPromise
    .then(() => {
      logger.info({ msg: 'MongoDB connection established', uri: sanitiseMongoUri(mongoUri) });
    })
    .catch((error) => {
      logger.error({ msg: 'Failed to establish MongoDB connection', error });
      connectionPromise = null;
    });

  return connectionPromise;
};

/**
 * Gracefully closes the MongoDB connection. Useful in integration tests and shutdown hooks.
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  if (!connectionPromise) {
    return;
  }

  await mongoose.connection.close();
  connectionPromise = null;
  logger.info({ msg: 'MongoDB connection closed' });
};

/**
 * Masks credentials out of the URI to prevent secrets from leaking into plain-text logs.
 */
const sanitiseMongoUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = '***';
    }
    if (url.username) {
      url.username = '***';
    }
    return url.toString();
  } catch {
    // For unexpected non-URL formats we fall back to a simple placeholder.
    return 'mongodb://***';
  }
};

