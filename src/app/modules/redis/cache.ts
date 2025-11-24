import { redis } from './client';
import CacheOptions  from 'redis';

/**
 * Redis Cache Service
 * Handles all caching operations with automatic expiration
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 5 minutes)
}

export class RedisCacheService {
  private static DEFAULT_TTL = 300; // 5 minutes

  /**
   * Generate cache key from query parameters
   */
  static generateCacheKey(prefix: string, params: Record<string, any>): string {
    // Sort keys for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);

    const paramsString = JSON.stringify(sortedParams);
    return `${prefix}:${Buffer.from(paramsString).toString('base64')}`;
  }

  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!redis.isOpen) {
        console.warn('[Cache] Redis not connected, skipping cache get');
        return null;
      }

      const cached = await redis.get(key);
      if (!cached) {
        console.log(`[Cache] MISS: ${key}`);
        return null;
      }

      console.log(`[Cache] HIT: ${key}`);
      return JSON.parse(cached) as T;
    } catch (error: any) {
      console.error('[Cache] Get error:', error.message);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    try {
      if (!redis.isOpen) {
        console.warn('[Cache] Redis not connected, skipping cache set');
        return;
      }

      const ttl = options.ttl || this.DEFAULT_TTL;
      const serialized = JSON.stringify(data);

      await redis.setEx(key, ttl, serialized);
      console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
    } catch (error: any) {
      console.error('[Cache] Set error:', error.message);
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      if (!redis.isOpen) {
        console.warn('[Cache] Redis not connected, skipping cache delete');
        return;
      }

      await redis.del(key);
      console.log(`[Cache] DELETE: ${key}`);
    } catch (error: any) {
      console.error('[Cache] Delete error:', error.message);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      if (!redis.isOpen) {
        console.warn('[Cache] Redis not connected, skipping pattern delete');
        return;
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`[Cache] DELETED ${keys.length} keys matching: ${pattern}`);
      }
    } catch (error: any) {
      console.error('[Cache] Delete pattern error:', error.message);
    }
  }

  /**
   * Clear all cache
   */
  static async flushAll(): Promise<void> {
    try {
      if (!redis.isOpen) {
        console.warn('[Cache] Redis not connected, skipping flush');
        return;
      }

      await redis.flushAll();
      console.log('[Cache] FLUSHED all cache');
    } catch (error: any) {
      console.error('[Cache] Flush error:', error.message);
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (!redis.isOpen) {
        return false;
      }

      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error: any) {
      console.error('[Cache] Exists error:', error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  static async getTTL(key: string): Promise<number> {
    try {
      if (!redis.isOpen) {
        return -1;
      }

      return await redis.ttl(key);
    } catch (error: any) {
      console.error('[Cache] TTL error:', error.message);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  static async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!redis.isOpen) {
        return 0;
      }

      return await redis.incrBy(key, amount);
    } catch (error: any) {
      console.error('[Cache] Increment error:', error.message);
      return 0;
    }
  }

  /**
   * Set cache with automatic refresh
   * Useful for frequently accessed data
   */
  static async setWithAutoRefresh(
    key: string,
    data: any,
    options: CacheOptions & { refreshCallback?: () => Promise<any> } = {}
  ): Promise<void> {
    try {
      await this.set(key, data, options);

      // Set a background refresh at 80% of TTL
      if (options.refreshCallback) {
        const ttl = options.ttl || this.DEFAULT_TTL;
        const refreshTime = ttl * 0.8 * 1000; // Convert to milliseconds

        setTimeout(async () => {
          try {
            const freshData = await options.refreshCallback!();
            await this.set(key, freshData, options);
          } catch (error: any) {
            console.error('[Cache] Auto-refresh error:', error.message);
          }
        }, refreshTime);
      }
    } catch (error: any) {
      console.error('[Cache] Set with auto-refresh error:', error.message);
    }
  }
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIXES = {
  SERVICES: 'services:list',
  SERVICE_DETAIL: 'services:detail',
  SUBSCRIPTIONS: 'subscriptions:list',
  SUBSCRIPTION_DETAIL: 'subscriptions:detail',
  USER_PROFILE: 'user:profile',
  PACKAGES: 'packages:list',
  BRANDS: 'brands:list',
  MODELS: 'models:list',
  CATEGORIES: 'categories:list',
  STATS: 'stats',
};

/**
 * Cache TTL configurations (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 900,          // 15 minutes
  VERY_LONG: 3600,    // 1 hour
  DAY: 86400,         // 24 hours
};