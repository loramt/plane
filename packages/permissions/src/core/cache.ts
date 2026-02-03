/**
 * Simple cache utilities for policy caching.
 * INTERNAL MODULE
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete all entries matching a pattern
   */
  deletePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache for policies
export const policyCache = new SimpleCache<unknown>();

/**
 * Generate cache key for user policies
 */
export function getPolicyCacheKey(userId: string, workspaceSlug: string): string {
  return `policies:${userId}:${workspaceSlug}`;
}

/**
 * Invalidate policy cache for a user
 */
export function invalidatePolicyCache(userId: string, workspaceSlug?: string): void {
  if (workspaceSlug) {
    policyCache.delete(getPolicyCacheKey(userId, workspaceSlug));
  } else {
    policyCache.deletePattern(new RegExp(`^policies:${userId}:`));
  }
}
