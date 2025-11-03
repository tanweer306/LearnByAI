/**
 * Cache analytics and cost tracking
 * Monitors cache performance and calculates OpenAI API cost savings
 */

import { cacheGet, cacheSet, cacheIncr, cacheIncrBy, CACHE_TTL } from "./redis";

// ============================================
// OPENAI PRICING (as of 2024)
// ============================================

const OPENAI_PRICING = {
  "gpt-4o-mini": {
    INPUT: 0.00015,   // per 1K tokens
    OUTPUT: 0.0006,   // per 1K tokens
  },
  "gpt-4o": {
    INPUT: 0.0025,
    OUTPUT: 0.01,
  },
  "text-embedding-3-large": {
    INPUT: 0.00013,
    OUTPUT: 0,
  },
};

// ============================================
// ANALYTICS KEYS
// ============================================

const ANALYTICS_KEYS = {
  CACHE_HIT: "analytics:cache:hit",
  CACHE_MISS: "analytics:cache:miss",
  TOKENS_SAVED: "analytics:tokens:saved",
  COST_SAVED: "analytics:cost:saved",
  ENDPOINT_STATS: "analytics:endpoint",
};

// ============================================
// COST CALCULATION
// ============================================

/**
 * Calculate cost for OpenAI API call
 * Assumes 70% input tokens, 30% output tokens for Q&A
 */
export function calculateOpenAICost(
  tokensUsed: number,
  model: string = "gpt-4o-mini"
): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING] || OPENAI_PRICING["gpt-4o-mini"];
  
  // Estimate token distribution
  const inputTokens = tokensUsed * 0.7;
  const outputTokens = tokensUsed * 0.3;
  
  const cost = 
    (inputTokens * pricing.INPUT / 1000) +
    (outputTokens * pricing.OUTPUT / 1000);
  
  return cost;
}

/**
 * Calculate cost savings from cached response
 */
export function calculateCostSavings(
  tokensUsed: number,
  model: string = "gpt-4o-mini"
): number {
  return calculateOpenAICost(tokensUsed, model);
}

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log cache hit
 */
export async function logCacheHit(
  endpoint: string,
  tokensSaved: number = 0,
  model: string = "gpt-4o-mini"
): Promise<void> {
  try {
    const now = new Date();
    const hourKey = `${ANALYTICS_KEYS.CACHE_HIT}:${getTimeKey(now, "hour")}`;
    const dayKey = `${ANALYTICS_KEYS.CACHE_HIT}:${getTimeKey(now, "day")}`;
    const weekKey = `${ANALYTICS_KEYS.CACHE_HIT}:${getTimeKey(now, "week")}`;
    
    // Increment hit counters
    await Promise.all([
      cacheIncr(hourKey),
      cacheIncr(dayKey),
      cacheIncr(weekKey),
    ]);
    
    // Set expiration
    await Promise.all([
      cacheSet(hourKey, await cacheGet(hourKey), 3600), // 1 hour
      cacheSet(dayKey, await cacheGet(dayKey), 86400), // 24 hours
      cacheSet(weekKey, await cacheGet(weekKey), 604800), // 7 days
    ]);
    
    // Track tokens saved
    if (tokensSaved > 0) {
      const tokensSavedKey = `${ANALYTICS_KEYS.TOKENS_SAVED}:${getTimeKey(now, "day")}`;
      await cacheIncrBy(tokensSavedKey, tokensSaved);
      await cacheSet(tokensSavedKey, await cacheGet(tokensSavedKey), 86400);
      
      // Track cost saved
      const costSaved = calculateCostSavings(tokensSaved, model);
      const costSavedKey = `${ANALYTICS_KEYS.COST_SAVED}:${getTimeKey(now, "day")}`;
      const currentCost = await cacheGet<number>(costSavedKey) || 0;
      await cacheSet(costSavedKey, currentCost + costSaved, 86400);
    }
    
    // Track per-endpoint stats
    const endpointKey = `${ANALYTICS_KEYS.ENDPOINT_STATS}:${endpoint}:hit:${getTimeKey(now, "day")}`;
    await cacheIncr(endpointKey);
    await cacheSet(endpointKey, await cacheGet(endpointKey), 86400);
    
    console.log(`[CACHE HIT] ${endpoint} (saved ${tokensSaved} tokens, $${calculateCostSavings(tokensSaved, model).toFixed(4)})`);
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to log cache hit:", error);
  }
}

/**
 * Log cache miss
 */
export async function logCacheMiss(endpoint: string): Promise<void> {
  try {
    const now = new Date();
    const hourKey = `${ANALYTICS_KEYS.CACHE_MISS}:${getTimeKey(now, "hour")}`;
    const dayKey = `${ANALYTICS_KEYS.CACHE_MISS}:${getTimeKey(now, "day")}`;
    const weekKey = `${ANALYTICS_KEYS.CACHE_MISS}:${getTimeKey(now, "week")}`;
    
    // Increment miss counters
    await Promise.all([
      cacheIncr(hourKey),
      cacheIncr(dayKey),
      cacheIncr(weekKey),
    ]);
    
    // Set expiration
    await Promise.all([
      cacheSet(hourKey, await cacheGet(hourKey), 3600),
      cacheSet(dayKey, await cacheGet(dayKey), 86400),
      cacheSet(weekKey, await cacheGet(weekKey), 604800),
    ]);
    
    // Track per-endpoint stats
    const endpointKey = `${ANALYTICS_KEYS.ENDPOINT_STATS}:${endpoint}:miss:${getTimeKey(now, "day")}`;
    await cacheIncr(endpointKey);
    await cacheSet(endpointKey, await cacheGet(endpointKey), 86400);
    
    console.log(`[CACHE MISS] ${endpoint}`);
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to log cache miss:", error);
  }
}

// ============================================
// STATS RETRIEVAL
// ============================================

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  tokensSaved: number;
  costSaved: number;
  period: string;
}

/**
 * Get cache statistics for a timeframe
 */
export async function getCacheStats(
  timeframe: "hour" | "day" | "week" = "day"
): Promise<CacheStats> {
  try {
    const now = new Date();
    const timeKey = getTimeKey(now, timeframe);
    
    const hitKey = `${ANALYTICS_KEYS.CACHE_HIT}:${timeKey}`;
    const missKey = `${ANALYTICS_KEYS.CACHE_MISS}:${timeKey}`;
    const tokensSavedKey = `${ANALYTICS_KEYS.TOKENS_SAVED}:${timeKey}`;
    const costSavedKey = `${ANALYTICS_KEYS.COST_SAVED}:${timeKey}`;
    
    const [hits, misses, tokensSaved, costSaved] = await Promise.all([
      cacheGet<number>(hitKey),
      cacheGet<number>(missKey),
      cacheGet<number>(tokensSavedKey),
      cacheGet<number>(costSavedKey),
    ]);
    
    const cacheHits = hits || 0;
    const cacheMisses = misses || 0;
    const totalRequests = cacheHits + cacheMisses;
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    
    return {
      hitRate,
      totalRequests,
      cacheHits,
      cacheMisses,
      tokensSaved: tokensSaved || 0,
      costSaved: costSaved || 0,
      period: timeframe,
    };
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to get cache stats:", error);
    return {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      tokensSaved: 0,
      costSaved: 0,
      period: timeframe,
    };
  }
}

/**
 * Get endpoint-specific statistics
 */
export async function getEndpointStats(
  endpoint: string,
  timeframe: "day" | "week" = "day"
): Promise<{
  endpoint: string;
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}> {
  try {
    const now = new Date();
    const timeKey = getTimeKey(now, timeframe);
    
    const hitKey = `${ANALYTICS_KEYS.ENDPOINT_STATS}:${endpoint}:hit:${timeKey}`;
    const missKey = `${ANALYTICS_KEYS.ENDPOINT_STATS}:${endpoint}:miss:${timeKey}`;
    
    const [hits, misses] = await Promise.all([
      cacheGet<number>(hitKey),
      cacheGet<number>(missKey),
    ]);
    
    const cacheHits = hits || 0;
    const cacheMisses = misses || 0;
    const totalRequests = cacheHits + cacheMisses;
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    
    return {
      endpoint,
      hits: cacheHits,
      misses: cacheMisses,
      hitRate,
      totalRequests,
    };
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to get endpoint stats:", error);
    return {
      endpoint,
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };
  }
}

/**
 * Get comprehensive analytics dashboard data
 */
export async function getDashboardStats(): Promise<{
  hourly: CacheStats;
  daily: CacheStats;
  weekly: CacheStats;
  endpoints: Array<{
    endpoint: string;
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}> {
  try {
    const [hourly, daily, weekly] = await Promise.all([
      getCacheStats("hour"),
      getCacheStats("day"),
      getCacheStats("week"),
    ]);
    
    // Get stats for common endpoints
    const endpointNames = ["query", "generate-quiz", "explain", "study-plan"];
    const endpointStats = await Promise.all(
      endpointNames.map(name => getEndpointStats(name, "day"))
    );
    
    return {
      hourly,
      daily,
      weekly,
      endpoints: endpointStats,
    };
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to get dashboard stats:", error);
    return {
      hourly: {
        hitRate: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        tokensSaved: 0,
        costSaved: 0,
        period: "hour",
      },
      daily: {
        hitRate: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        tokensSaved: 0,
        costSaved: 0,
        period: "day",
      },
      weekly: {
        hitRate: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        tokensSaved: 0,
        costSaved: 0,
        period: "week",
      },
      endpoints: [],
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate time-based key for analytics
 */
function getTimeKey(date: Date, period: "hour" | "day" | "week"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  
  switch (period) {
    case "hour":
      return `${year}-${month}-${day}-${hour}`;
    case "day":
      return `${year}-${month}-${day}`;
    case "week":
      // Get week number
      const weekNum = getWeekNumber(date);
      return `${year}-W${String(weekNum).padStart(2, "0")}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format hit rate as percentage
 */
export function formatHitRate(hitRate: number): string {
  return `${(hitRate * 100).toFixed(2)}%`;
}

/**
 * Calculate monthly savings projection
 */
export async function getMonthlyProjection(): Promise<{
  currentDailySavings: number;
  projectedMonthlySavings: number;
  projectedYearlySavings: number;
}> {
  try {
    const dailyStats = await getCacheStats("day");
    const currentDailySavings = dailyStats.costSaved;
    
    return {
      currentDailySavings,
      projectedMonthlySavings: currentDailySavings * 30,
      projectedYearlySavings: currentDailySavings * 365,
    };
  } catch (error) {
    console.error("[ANALYTICS ERROR] Failed to get monthly projection:", error);
    return {
      currentDailySavings: 0,
      projectedMonthlySavings: 0,
      projectedYearlySavings: 0,
    };
  }
}
