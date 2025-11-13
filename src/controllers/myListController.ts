/**
 * @file myListController.ts
 * @description HTTP handlers bridging Express routes with the service layer.
 */

import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import {
  addToMyList,
  decodeCursor,
  listMyList,
  removeFromMyList
} from '../services/myListService';
import { HttpError } from '../middleware/errorHandler';

/**
 * Reusable schema for validating path parameters and request bodies.
 */
const userIdParamSchema = z.object({
  userId: z.string().min(1, 'userId is required')
});

const addBodySchema = z.object({
  contentId: z.string().min(1, 'contentId is required'),
  contentType: z.enum(['Movie', 'TVShow'])
});

const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => Number(value ?? 20))
    .refine((value) => Number.isInteger(value) && value > 0 && value <= 100, 'limit is invalid'),
  cursor: z.string().optional()
});

/**
 * POST handler to add a content item into a user's list.
 */
export const handleAddToMyList = async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdParamSchema.parse(req.params);
  const { contentId, contentType } = addBodySchema.parse(req.body);

  const result = await addToMyList(userId, contentId, contentType);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: result
  });
};

/**
 * DELETE handler removing a content item from a user's list.
 */
export const handleRemoveFromMyList = async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdParamSchema.parse(req.params);
  const paramsSchema = z.object({
    itemId: z.string().min(1, 'itemId is required')
  });
  const { itemId } = paramsSchema.parse(req.params);

  await removeFromMyList(userId, itemId);

  res.status(StatusCodes.NO_CONTENT).send();
};

/**
 * GET handler retrieving a paginated slice of the user's list.
 */
export const handleListMyItems = async (req: Request, res: Response): Promise<void> => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = listQuerySchema.parse(req.query);
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

  if (query.limit > 100) {
    throw new HttpError('limit exceeds maximum of 100', StatusCodes.BAD_REQUEST, 'limit_too_large');
  }

  const result = await listMyList(userId, {
    limit: query.limit,
    cursor
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

