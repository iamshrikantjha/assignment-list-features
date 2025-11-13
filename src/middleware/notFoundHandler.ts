/**
 * @file notFoundHandler.ts
 * @description Lean middleware to return a JSON 404 for unhandled routes.
 */

import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: {
      code: 'not_found',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};

