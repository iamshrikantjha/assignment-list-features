/**
 * @file Movie.ts
 * @description Mongoose model representing movies within the catalogue.
 */

import { Schema, model } from 'mongoose';

import type { Movie } from '../types/domain';

const movieSchema = new Schema<Movie>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: 'text' },
    description: { type: String, required: true },
    genres: { type: [String], required: true, default: [] },
    releaseDate: { type: Date, required: true },
    director: { type: String, required: true },
    actors: { type: [String], required: true, default: [] }
  },
  { versionKey: false }
);

export const MovieModel = model<Movie>('Movie', movieSchema, 'movies');

