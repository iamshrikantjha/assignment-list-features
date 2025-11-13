/**
 * @file cache.ts
 * @description Lightweight in-memory cache with TTL and max size enforcement.
 * Provides a production-friendly abstraction that can later be swapped with Redis while keeping
 * behaviour identical for callers. Extensive comments reflect the user's request.
 */

export interface CacheOptions {
  /** How long an entry may live before treated as stale, in seconds. */
  ttlSeconds: number;
  /** Maximum number of entries to keep. Implemented with an LRU eviction strategy. */
  maxItems: number;
}

interface CacheEntry<Value> {
  value: Value;
  expiresAt: number;
  // Retain a monotonically increasing counter to implement a deterministic LRU.
  lastAccessCounter: number;
}

/**
 * Simple LRU cache tailored for our list API.
 * This is intentionally implemented without external dependencies to keep the footprint small.
 */
export class InMemoryCache<Value> {
  private readonly store = new Map<string, CacheEntry<Value>>();
  private readonly options: CacheOptions;
  private accessCounter = 0;

  constructor(options: CacheOptions) {
    this.options = options;
  }

  /**
    * Retrieve a value while performing TTL validation.
    * When returning stale data we also clean up the entry to keep the cache healthy.
    */
  public get(key: string): Value | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (this.options.ttlSeconds > 0 && now > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    entry.lastAccessCounter = ++this.accessCounter;
    return entry.value;
  }

  /**
   * Insert or update an entry while enforcing TTL and size constraints.
   */
  public set(key: string, value: Value): void {
    const expiresAt =
      this.options.ttlSeconds > 0
        ? Date.now() + this.options.ttlSeconds * 1000
        : Number.POSITIVE_INFINITY;

    this.store.set(key, {
      value,
      expiresAt,
      lastAccessCounter: ++this.accessCounter
    });

    this.enforceMaxItems();
  }

  /**
   * Remove an entry explicitly. Used to evict stale data when we mutate the underlying resource.
   */
  public delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear the entire cache. Handy for integration tests.
   */
  public clear(): void {
    this.store.clear();
    this.accessCounter = 0;
  }

  /**
   * Internal helper to respect the configured max size by expiring the least recently used key.
   */
  private enforceMaxItems(): void {
    if (this.store.size <= this.options.maxItems) {
      return;
    }

    let lruKey: string | undefined;
    let lowestCounter = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessCounter < lowestCounter) {
        lowestCounter = entry.lastAccessCounter;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.store.delete(lruKey);
    }
  }
}

