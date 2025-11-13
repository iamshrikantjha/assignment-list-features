/** Shared domain-level TypeScript types for the OTT platform. */

/**
 * Literal union type representing the only allowed genres for a content item.
 * Having a union instead of a plain string helps TypeScript catch typos at compile time.
 */
export type Genre = 'Action' | 'Comedy' | 'Drama' | 'Fantasy' | 'Horror' | 'Romance' | 'SciFi';

/**
 * Enumerated list of listable content types. This helps us validate payloads consistently
 * and allows MongoDB indexes to remain tight thanks to few cardinality values.
 */
export type ListableContentKind = 'Movie' | 'TVShow';

/**
 * Canonical representation of a platform user as shared with the business domain team.
 * Persisted in MongoDB with the `UserModel` defined in `src/models/User.ts`.
 */
export interface User {
  /** Stable, globally unique identifier for the user. */
  id: string;
  /** Human-friendly identifier surfaced in the UI. */
  username: string;
  /** Personalisation data grouping favourite and disliked genres. */
  preferences: {
    favoriteGenres: Genre[];
    dislikedGenres: Genre[];
  };
  /** View history we can later leverage for personalised recommendations. */
  watchHistory: Array<{
    contentId: string;
    watchedOn: Date;
    rating?: number;
  }>;
}

/**
 * Canonical representation of a movie object exposed by the catalogue service.
 */
export interface Movie {
  id: string;
  title: string;
  description: string;
  genres: Genre[];
  releaseDate: Date;
  director: string;
  actors: string[];
}

/**
 * Canonical representation of a television show with episodic metadata.
 */
export interface TVShow {
  id: string;
  title: string;
  description: string;
  genres: Genre[];
  episodes: Array<{
    episodeNumber: number;
    seasonNumber: number;
    releaseDate: Date;
    director: string;
    actors: string[];
  }>;
}

/**
 * Public contract for any item that can live in a user's personal list.
 * We maintain a superset of data so the consumer can render without extra round-trips.
 */
export interface MyListItemDTO {
  /** Redundant `userId` helps ensure we do not accidentally mix cross-user data. */
  userId: string;
  /** Primary key referencing the content catalogue. */
  contentId: string;
  /** Content type ensures we can fan out to the right catalogue service quickly. */
  contentType: ListableContentKind;
  /** Mirror of the content title for faster UI rendering. */
  title: string;
  /** Optional vector containing the item genres. */
  genres?: Genre[];
  /** Date when the item entered the list for sortability. */
  addedAt: Date;
}

