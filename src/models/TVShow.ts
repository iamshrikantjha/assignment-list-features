/**
 * @file TVShow.ts
 * @description Mongoose model representing TV shows with episode metadata.
 */

import { Schema, model } from 'mongoose';

import type { TVShow } from '../types/domain';

const episodeSchema = new Schema<TVShow['episodes'][number]>(
  {
    episodeNumber: { type: Number, required: true },
    seasonNumber: { type: Number, required: true },
    releaseDate: { type: Date, required: true },
    director: { type: String, required: true },
    actors: { type: [String], required: true, default: [] }
  },
  { _id: false }
);

const tvShowSchema = new Schema<TVShow>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: 'text' },
    description: { type: String, required: true },
    genres: { type: [String], required: true, default: [] },
    episodes: { type: [episodeSchema], required: true, default: [] }
  },
  { versionKey: false }
);

export const TVShowModel = model<TVShow>('TVShow', tvShowSchema, 'tv_shows');

