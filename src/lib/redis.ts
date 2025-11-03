import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client (singleton)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes for organized namespace
export const CACHE_KEYS = {
  USER: "user:",
  BOOK: "book:",
  CLASS: "class:",
  QUIZ: "quiz:",
  SESSION: "session:",
  ANALYTICS: "analytics:",
  QA: "qa:",
  EXPLAIN: "explain:",
  PLAN: "plan:",
  YOUTUBE: "youtube:",
  IMAGES: "images:",
  RATELIMIT: "ratelimit:",
  DB: "db:",
};

// Cache TTL (Time To Live) in seconds - optimized for AI responses
export const CACHE_TTL = {
  QA_RESPONSE: 7 * 24 * 60 * 60,        // 7 days - AI Q&A
  QUIZ: 30 * 24 * 60 * 60,              // 30 days - Generated quizzes
  STUDY_PLAN: 7 * 24 * 60 * 60,         // 7 days - Study plans
  EXPLANATION: 14 * 24 * 60 * 60,       // 14 days - AI explanations
  YOUTUBE_SEARCH: 24 * 60 * 60,         // 24 hours - YouTube results
  IMAGE_SEARCH: 24 * 60 * 60,           // 24 hours - Image search
  SESSION: 60 * 60,                      // 1 hour - User sessions
  BOOK_METADATA: 5 * 60,                 // 5 minutes - Book data
  CLASS_MEMBERS: 5 * 60,                 // 5 minutes - Class lists
  RATE_LIMIT: 15 * 60,                   // 15 minutes - Rate limiting
  SHORT: 60,                             // 1 minute
  MEDIUM: 300,                           // 5 minutes
  LONG: 3600,                            // 1 hour
  DAY: 86400,                            // 24 hours
};

// ============================================
// BASIC CACHE OPERATIONS
// ============================================

/**
 * Get cached data with automatic JSON parsing
 * Returns null if key doesn't exist or on error
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (data === null) return null;
    
    // If data is already an object, return it
    if (typeof data === 'object') return data as T;
    
    // Try to parse JSON string
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as T;
      }
    }
    
    return data as T;
  } catch (error) {
    console.error(`[CACHE ERROR] GET failed for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data with TTL and automatic JSON serialization
 * Returns true on success, false on error
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  try {
    // Serialize objects to JSON
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (ttl > 0) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
    
    console.log(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] SET failed for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cached data
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    console.log(`[CACHE DELETE] ${key}`);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] DELETE failed for key ${key}:`, error);
    return false;
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`[CACHE ERROR] EXISTS failed for key ${key}:`, error);
    return false;
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Set multiple cache entries at once
 */
export async function cacheSetMany(
  items: Array<{ key: string; value: any; ttl?: number }>
): Promise<boolean> {
  try {
    const pipeline = redis.pipeline();
    
    for (const item of items) {
      const serialized = typeof item.value === 'object' 
        ? JSON.stringify(item.value) 
        : item.value;
      
      if (item.ttl && item.ttl > 0) {
        pipeline.setex(item.key, item.ttl, serialized);
      } else {
        pipeline.set(item.key, serialized);
      }
    }
    
    await pipeline.exec();
    console.log(`[CACHE SET MANY] ${items.length} items`);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] SET MANY failed:`, error);
    return false;
  }
}

/**
 * Get multiple cache entries at once
 */
export async function cacheGetMany<T = any>(keys: string[]): Promise<(T | null)[]> {
  try {
    if (keys.length === 0) return [];
    
    const results = await redis.mget(...keys);
    
    return results.map((data) => {
      if (data === null) return null;
      
      if (typeof data === 'object') return data as T;
      
      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as T;
        }
      }
      
      return data as T;
    });
  } catch (error) {
    console.error(`[CACHE ERROR] GET MANY failed:`, error);
    return keys.map(() => null);
  }
}

// ============================================
// HASH OPERATIONS (for structured data)
// ============================================

/**
 * Set a field in a hash
 */
export async function cacheHSet(
  key: string,
  field: string,
  value: any
): Promise<boolean> {
  try {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    await redis.hset(key, { [field]: serialized });
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] HSET failed for ${key}.${field}:`, error);
    return false;
  }
}

/**
 * Get a field from a hash
 */
export async function cacheHGet<T = any>(
  key: string,
  field: string
): Promise<T | null> {
  try {
    const data = await redis.hget(key, field);
    if (data === null) return null;
    
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as T;
      }
    }
    
    return data as T;
  } catch (error) {
    console.error(`[CACHE ERROR] HGET failed for ${key}.${field}:`, error);
    return null;
  }
}

/**
 * Get all fields from a hash
 */
export async function cacheHGetAll<T = Record<string, any>>(
  key: string
): Promise<T | null> {
  try {
    const data = await redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    
    // Parse JSON values
    const parsed: any = {};
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      } else {
        parsed[field] = value;
      }
    }
    
    return parsed as T;
  } catch (error) {
    console.error(`[CACHE ERROR] HGETALL failed for ${key}:`, error);
    return null;
  }
}

// ============================================
// COUNTER OPERATIONS
// ============================================

/**
 * Increment a counter
 */
export async function cacheIncr(key: string): Promise<number> {
  try {
    const result = await redis.incr(key);
    return result;
  } catch (error) {
    console.error(`[CACHE ERROR] INCR failed for key ${key}:`, error);
    return 0;
  }
}

/**
 * Decrement a counter
 */
export async function cacheDecr(key: string): Promise<number> {
  try {
    const result = await redis.decr(key);
    return result;
  } catch (error) {
    console.error(`[CACHE ERROR] DECR failed for key ${key}:`, error);
    return 0;
  }
}

/**
 * Increment by a specific amount
 */
export async function cacheIncrBy(key: string, amount: number): Promise<number> {
  try {
    const result = await redis.incrby(key, amount);
    return result;
  } catch (error) {
    console.error(`[CACHE ERROR] INCRBY failed for key ${key}:`, error);
    return 0;
  }
}

// ============================================
// EXPIRATION MANAGEMENT
// ============================================

/**
 * Set expiration time for a key
 */
export async function cacheExpire(key: string, ttl: number): Promise<boolean> {
  try {
    await redis.expire(key, ttl);
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] EXPIRE failed for key ${key}:`, error);
    return false;
  }
}

/**
 * Get remaining TTL for a key
 */
export async function cacheTTL(key: string): Promise<number> {
  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error(`[CACHE ERROR] TTL failed for key ${key}:`, error);
    return -1;
  }
}

// ============================================
// PATTERN OPERATIONS
// ============================================

/**
 * Delete all keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE DELETE PATTERN] ${pattern} (${keys.length} keys)`);
    }
    return true;
  } catch (error) {
    console.error(`[CACHE ERROR] DELETE PATTERN failed for ${pattern}:`, error);
    return false;
  }
}

// ============================================
// LEGACY COMPATIBILITY (for existing code)
// ============================================

export const cacheHelpers = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDelete,
  delPattern: cacheDeletePattern,
  incr: cacheIncr,
  exists: cacheExists,
  ttl: cacheTTL,
};

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log("✅ Redis connection successful");
    return true;
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    return false;
  }
}

/**
 * Get Redis info and stats
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    return {
      connected: true,
      latency,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}
