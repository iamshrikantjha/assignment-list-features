/**
 * @file server.ts
 * @description Entry point responsible for bootstrapping the Express server.
 */

import http from 'http';

import { buildApp } from './app';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = buildApp();
const server = http.createServer(app);

/**
 * Kicks off the MongoDB connection followed by HTTP server startup.
 * The sequential start ensures API traffic is only accepted once dependencies are ready.
 */
const start = async (): Promise<void> => {
  try {
    await connectToDatabase();
    server.listen(env.port, () => {
      logger.info({ msg: `Server listening on port ${env.port}` });
    });
  } catch (error) {
    logger.error({ msg: 'Failed to start server', error });
    process.exit(1);
  }
};

start();

/**
 * Gracefully close resources upon termination signals to avoid dropping in-flight requests.
 */
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ msg: 'Shutdown signal received', signal });
  server.close(async (closeErr) => {
    if (closeErr) {
      logger.error({ msg: 'Error while closing server', closeErr });
      process.exit(1);
    }
    await disconnectFromDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

