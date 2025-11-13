/**
 * @file errorHandler.ts
 * @description Central Express error-handling middleware emitting consistent JSON responses.
 */

import type { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '../utils/logger';

/**
 * Domain-level error base class to encode HTTP status and machine-friendly error codes.
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/**
 * Express error-handling middleware signature.
 * Every thrown error eventually funnels through this function.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isHttpError = err instanceof HttpError;
  const statusCode = isHttpError ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;

  // Log contextual metadata. Sensitive request data gets stripped by logger redaction rules.
  logger.error({
    msg: 'Request failed',
    path: req.path,
    method: req.method,
    statusCode,
    error: err
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: isHttpError ? err.errorCode : 'internal_error',
      message: err.message ?? 'An unexpected error occurred'
    }
  });
};

