/**
 * @file myListService.ts
 * @description Business logic for managing a user's "My List" catalogue.
 */

import { StatusCodes } from 'http-status-codes';
import type { FilterQuery } from 'mongoose';

import { MyListItemModel, type MyListItemDocument } from '../models/MyListItem';
import { MovieModel } from '../models/Movie';
import { TVShowModel } from '../models/TVShow';
import type { ListableContentKind, MyListItemDTO } from '../types/domain';
import { InMemoryCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { HttpError } from '../middleware/errorHandler';
import { env } from '../config/env';

/**
 * Cursor payload describing the pagination state returned to consumers.
 */
export interface CursorPayload {
  addedAt: string;
  contentId: string;
}

/**
 * Parsed request options for the list operation.
 */
export interface ListOptions {
  limit: number;
  cursor?: CursorPayload;
}

/**
 * Serialise the cursor to an opaque string that consumers can pass back verbatim.
 */
export const encodeCursor = (cursor: CursorPayload): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');

/**
 * Deserialize the consumer-provided cursor. Throws if invalid to keep the contract strict.
 */
export const decodeCursor = (rawCursor: string): CursorPayload => {
  try {
    const decoded = Buffer.from(rawCursor, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed.addedAt || !parsed.contentId) {
      throw new Error('Invalid cursor payload');
    }
    return parsed;
  } catch (error) {
    throw new HttpError('Invalid cursor provided', StatusCodes.BAD_REQUEST, 'invalid_cursor');
  }
};

/**
 * Instantiate a cache tuned by environment variables for user list snapshots.
 */
type ListCacheValue = { items: MyListItemDTO[]; nextCursor?: string };

const listCache = new InMemoryCache<ListCacheValue>({
  ttlSeconds: env.cacheTtlSeconds,
  maxItems: env.cacheMaxItems
});

/**
 * Compose a deterministic cache key from the user id and pagination params.
 */
const cacheKey = (userId: string, options: ListOptions): string =>
  JSON.stringify({
    userId,
    limit: options.limit,
    cursor: options.cursor
  });

/**
 * Look up the catalogue so we can enrich the stored metadata for render-speed.
 * Returns the canonical title and genres to surface in the UI.
 */
const resolveContentMetadata = async (
  contentId: string,
  contentType: ListableContentKind
): Promise<{ title: string; genres: string[] }> => {
  if (contentType === 'Movie') {
    const movie = await MovieModel.findOne({ id: contentId }).lean();
    if (!movie) {
      throw new HttpError(
        `Movie ${contentId} not found`,
        StatusCodes.NOT_FOUND,
        'movie_not_found'
      );
    }
    return { title: movie.title, genres: movie.genres };
  }

  const show = await TVShowModel.findOne({ id: contentId }).lean();
  if (!show) {
    throw new HttpError(`TV show ${contentId} not found`, StatusCodes.NOT_FOUND, 'show_not_found');
  }
  return { title: show.title, genres: show.genres };
};

/**
 * Adds a content item to the user's personal list.
 */
export const addToMyList = async (
  userId: string,
  contentId: string,
  contentType: ListableContentKind
): Promise<MyListItemDTO> => {
  const { title, genres } = await resolveContentMetadata(contentId, contentType);

  try {
    const created = await MyListItemModel.create({
      userId,
      contentId,
      contentType,
      title,
      genres,
      addedAt: new Date()
    });

    // Invalidate cache for the user since the list mutated.
    invalidateCacheForUser(userId);

    return created.toDTO();
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new HttpError(
        `Content ${contentId} already exists in the user's list`,
        StatusCodes.CONFLICT,
        'already_in_list'
      );
    }
    logger.error({ msg: 'Failed to add item to list', userId, contentId, error });
    throw error;
  }
};

/**
 * Removes a content item from the user's personal list.
 */
export const removeFromMyList = async (userId: string, contentId: string): Promise<void> => {
  const result = await MyListItemModel.deleteOne({ userId, contentId });
  if (result.deletedCount === 0) {
    throw new HttpError(
      `Content ${contentId} is not in the user's list`,
      StatusCodes.NOT_FOUND,
      'not_in_list'
    );
  }

  invalidateCacheForUser(userId);
};

/**
 * Lists the user's content items with cursor-based pagination for O(1) page fetches.
 */
export const listMyList = async (
  userId: string,
  options: ListOptions
): Promise<{ items: MyListItemDTO[]; nextCursor?: string }> => {
  const cachedValue = listCache.get(cacheKey(userId, options));
  if (cachedValue) {
    return cachedValue;
  }

  const query: FilterQuery<MyListItemDocument> = { userId };
  if (options.cursor) {
    query.$or = [
      { addedAt: { $lt: new Date(options.cursor.addedAt) } },
      {
        addedAt: new Date(options.cursor.addedAt),
        contentId: { $lt: options.cursor.contentId }
      }
    ];
  }

  const items = await MyListItemModel.find(query)
    .sort({ addedAt: -1, contentId: -1 })
    .limit(options.limit + 1)
    .lean();

  const hasMore = items.length > options.limit;
  const trimmed = hasMore ? items.slice(0, options.limit) : items;

  const dtos = trimmed.map((item) => ({
    userId: item.userId,
    contentId: item.contentId,
    contentType: item.contentType,
    title: item.title,
    genres: item.genres,
    addedAt: item.addedAt
  }));

  const nextCursor = hasMore
    ? encodeCursor({
        addedAt: trimmed[trimmed.length - 1]!.addedAt.toISOString(),
        contentId: trimmed[trimmed.length - 1]!.contentId
      })
    : undefined;

  const result = { items: dtos, nextCursor };
  listCache.set(cacheKey(userId, options), result);

  return result;
};

/**
 * Helper to identify Mongo duplicate key errors reliably.
 */
const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 11000
  );
};

/**
 * Wipes cached entries for a given user across all pagination combinations.
 * For simplicity we clear the entire cache when the list changes for now.
 */
const invalidateCacheForUser = (userId: string): void => {
  // A more sophisticated implementation could track keys per user, but this keeps things predictable.
  listCache.clear();
  logger.debug({ msg: 'Invalidated list cache after mutation', userId });
};

