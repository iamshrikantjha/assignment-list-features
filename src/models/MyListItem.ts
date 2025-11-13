/**
 * @file MyListItem.ts
 * @description Mongoose schema representing an item saved within a user's personal list.
 */

import { Schema, model } from 'mongoose';

import type { Genre, ListableContentKind, MyListItemDTO } from '../types/domain';

export interface MyListItemDocument {
  userId: string;
  contentId: string;
  contentType: ListableContentKind;
  title: string;
  genres: Genre[];
  addedAt: Date;
  toDTO: () => MyListItemDTO;
}

const myListItemSchema = new Schema<MyListItemDocument>(
  {
    userId: { type: String, required: true, index: true },
    contentId: { type: String, required: true },
    contentType: { type: String, required: true, enum: ['Movie', 'TVShow'] },
    title: { type: String, required: true },
    genres: { type: [String], required: true, default: [] },
    addedAt: { type: Date, required: true, default: () => new Date() }
  },
  {
    versionKey: false
  }
);

// Ensure we do not insert duplicates for the same user/content pair.
myListItemSchema.index({ userId: 1, contentId: 1 }, { unique: true });
// Optimise pagination by sorting on addedAt descending while hashing by userId.
myListItemSchema.index({ userId: 1, addedAt: -1 });

/**
 * We expose a lean method to convert raw documents into the DTO contract for API responses.
 */
myListItemSchema.method(
  'toDTO',
  function toDTO(this: MyListItemDocument): MyListItemDTO {
    return {
      userId: this.userId,
      contentId: this.contentId,
      contentType: this.contentType,
      title: this.title,
      genres: this.genres,
      addedAt: this.addedAt
    };
  }
);

export const MyListItemModel = model<MyListItemDocument>('MyListItem', myListItemSchema, 'my_list');

