/**
 * @file requestLogger.ts
 * @description Express middleware that plugs Pino HTTP logging into the pipeline.
 */

import type { RequestHandler } from 'express';
import pinoHttp from 'pino-http';

import { logger } from '../utils/logger';

/**
 * We wrap pino-http so we can toggle logging depth dynamically via environment variables.
 * The logger is instantiated once at module scope to avoid repeated allocations.
 */
const httpLogger = pinoHttp({
  logger,
  autoLogging: process.env.REQUEST_LOG_LEVEL === 'silent' ? false : { ignorePaths: ['/health'] },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  }
});

export const requestLogger: RequestHandler = (req, res, next) => httpLogger(req, res, next);

