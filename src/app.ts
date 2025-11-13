/**
 * @file app.ts
 * @description Express application bootstrap with security middlewares and routing.
 */

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import 'express-async-errors';

import { apiRouter } from './routes';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

export const buildApp = (): express.Application => {
  const app = express();

  // Security headers harden the API against common attacks.
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );

  // Gzip responses for faster delivery on slow networks.
  app.use(compression());

  // Allow cross-origin requests for our broad device ecosystem.
  app.use(cors());

  // JSON parser with a generous limit to support bulk operations.
  app.use(express.json({ limit: '1mb' }));

  // Structured request logging for observability.
  app.use(requestLogger);

  // Health endpoint for k8s style probes.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Mount the versioned API routes.
  app.use('/api/v1', apiRouter);

  // Provide a JSON 404 before we reach the error handler.
  app.use(notFoundHandler);

  // Final error handling stage to ensure consistent responses.
  app.use(errorHandler);

  return app;
};

