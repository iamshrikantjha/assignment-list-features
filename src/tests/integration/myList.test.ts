/**
 * @file myList.test.ts
 * @description Integration tests covering the My List API surface.
 */

import request from 'supertest';
import mongoose from 'mongoose';

import { getApp } from '../setupTestEnv';
import { MovieModel } from '../../models/Movie';
import { TVShowModel } from '../../models/TVShow';
import { MyListItemModel } from '../../models/MyListItem';

const buildMovie = (overrides?: Partial<{ id: string; title: string }>) => ({
  id: overrides?.id ?? new mongoose.Types.ObjectId().toHexString(),
  title: overrides?.title ?? 'The Great Adventure',
  description: 'An epic adventure film.',
  genres: ['Action'],
  releaseDate: new Date('2024-01-01'),
  director: 'Jane Director',
  actors: ['Actor A', 'Actor B']
});

const buildShow = (overrides?: Partial<{ id: string; title: string }>) => ({
  id: overrides?.id ?? new mongoose.Types.ObjectId().toHexString(),
  title: overrides?.title ?? 'Space Chronicles',
  description: 'An interstellar sci-fi drama.',
  genres: ['SciFi'],
  episodes: [
    {
      episodeNumber: 1,
      seasonNumber: 1,
      releaseDate: new Date('2023-09-10'),
      director: 'John Showrunner',
      actors: ['Actor C']
    }
  ]
});

describe('My List API', () => {
  const userId = 'user-123';

  beforeEach(async () => {
    await MovieModel.create(buildMovie({ id: 'movie-001', title: 'Movie One' }));
    await TVShowModel.create(buildShow({ id: 'show-001', title: 'Show One' }));
  });

  describe('POST /api/v1/users/:userId/my-list', () => {
    it('stores a movie in the user list', async () => {
      const response = await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'movie-001', contentType: 'Movie' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contentId).toBe('movie-001');

      const stored = await MyListItemModel.findOne({ userId, contentId: 'movie-001' });
      expect(stored).not.toBeNull();
    });

    it('rejects duplicates with a conflict status', async () => {
      await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'movie-001', contentType: 'Movie' })
        .expect(201);

      const response = await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'movie-001', contentType: 'Movie' })
        .expect(409);

      expect(response.body.error.code).toBe('already_in_list');
    });

    it('returns not found when content is unknown', async () => {
      const response = await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'non-existent', contentType: 'Movie' })
        .expect(404);

      expect(response.body.error.code).toBe('movie_not_found');
    });
  });

  describe('DELETE /api/v1/users/:userId/my-list/:itemId', () => {
    it('removes an item from the list', async () => {
      await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'movie-001', contentType: 'Movie' })
        .expect(201);

      await request(getApp())
        .delete(`/api/v1/users/${userId}/my-list/movie-001`)
        .expect(204);

      const stored = await MyListItemModel.findOne({ userId, contentId: 'movie-001' });
      expect(stored).toBeNull();
    });

    it('returns 404 removing non-existent content', async () => {
      const response = await request(getApp())
        .delete(`/api/v1/users/${userId}/my-list/unknown`)
        .expect(404);

      expect(response.body.error.code).toBe('not_in_list');
    });
  });

  describe('GET /api/v1/users/:userId/my-list', () => {
    it('returns paginated results with cursor', async () => {
      await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'movie-001', contentType: 'Movie' });
      await request(getApp())
        .post(`/api/v1/users/${userId}/my-list`)
        .send({ contentId: 'show-001', contentType: 'TVShow' });

      const firstPage = await request(getApp())
        .get(`/api/v1/users/${userId}/my-list`)
        .query({ limit: 1 })
        .expect(200);

      expect(firstPage.body.success).toBe(true);
      expect(firstPage.body.data.items).toHaveLength(1);
      expect(firstPage.body.data.nextCursor).toBeDefined();

      const secondPage = await request(getApp())
        .get(`/api/v1/users/${userId}/my-list`)
        .query({ limit: 1, cursor: firstPage.body.data.nextCursor })
        .expect(200);

      expect(secondPage.body.data.items).toHaveLength(1);
      expect(secondPage.body.data.nextCursor).toBeUndefined();
    });

    it('guards against invalid cursor payloads', async () => {
      const response = await request(getApp())
        .get(`/api/v1/users/${userId}/my-list`)
        .query({ cursor: 'invalid-base64' })
        .expect(400);

      expect(response.body.error.code).toBe('invalid_cursor');
    });

    it('rejects excessive limits', async () => {
      const response = await request(getApp())
        .get(`/api/v1/users/${userId}/my-list`)
        .query({ limit: 500 })
        .expect(400);

      expect(response.body.error.code).toBe('limit_too_large');
    });
  });
});

