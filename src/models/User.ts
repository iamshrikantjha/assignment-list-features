/**
 * @file User.ts
 * @description Mongoose schema for platform users. Mirrors the domain contract in `src/types/domain.ts`.
 */

import { Schema, model } from 'mongoose';

import type { User } from '../types/domain';

/**
 * Dedicated schema for embedded watch history entries to keep the main schema tidy.
 */
const watchHistorySchema = new Schema<User['watchHistory'][number]>(
  {
    contentId: { type: String, required: true, index: true },
    watchedOn: { type: Date, required: true },
    rating: { type: Number, required: false, min: 0, max: 5 }
  },
  { _id: false }
);

/**
 * The main user schema. We keep timestamps disabled as they are already provided by upstream auth service.
 */
const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    preferences: {
      favoriteGenres: { type: [String], default: [], required: true },
      dislikedGenres: { type: [String], default: [], required: true }
    },
    watchHistory: { type: [watchHistorySchema], default: [] }
  },
  {
    versionKey: false
  }
);

/**
 * The compiled Mongoose model exported for use in seed scripts and tests.
 */
export const UserModel = model<User>('User', userSchema, 'users');

