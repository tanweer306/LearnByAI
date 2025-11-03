/**
 * Rate limiting middleware using Redis
 * Implements sliding window rate limiting for API endpoints
 */

import { checkRateLimit, incrementRateLimit, getRateLimitInfo } from "./cache";

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

export const RATE_LIMITS = {
  // AI endpoints (more restrictive)
  AI_QUERY: {
    student: { limit: 100, window: 900 },      // 100 requests per 15 min
    teacher: { limit: 500, window: 900 },      // 500 requests per 15 min
    school: { limit: 2000, window: 900 },      // 2000 requests per 15 min
    admin: { limit: 10000, window: 900 },      // 10000 requests per 15 min
  },
  
  // Quiz generation
  QUIZ_GENERATION: {
    student: { limit: 50, window: 900 },
    teacher: { limit: 200, window: 900 },
    school: { limit: 1000, window: 900 },
    admin: { limit: 5000, window: 900 },
  },
  
  // Study plan generation
  STUDY_PLAN: {
    student: { limit: 20, window: 3600 },     // 20 per hour
    teacher: { limit: 100, window: 3600 },
    school: { limit: 500, window: 3600 },
    admin: { limit: 2000, window: 3600 },
  },
  
  // General API endpoints
  GENERAL: {
    student: { limit: 1000, window: 900 },
    teacher: { limit: 2000, window: 900 },
    school: { limit: 10000, window: 900 },
    admin: { limit: 50000, window: 900 },
  },
};

// ============================================
// RATE LIMIT MIDDLEWARE
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfter?: number;
}

/**
 * Apply rate limiting to a request
 * Returns rate limit info and whether request is allowed
 */
export async function rateLimitMiddleware(
  userId: string,
  userRole: string,
  endpoint: string,
  limitType: keyof typeof RATE_LIMITS = "GENERAL"
): Promise<RateLimitResult> {
  try {
    // Get rate limit config for user role
    const config = getRateLimitConfig(userRole, limitType);
    
    // Check current rate limit
    const result = await checkRateLimit(
      userId,
      endpoint,
      config.limit,
      config.window
    );
    
    if (!result.allowed) {
      // Calculate retry-after in seconds
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = result.resetAt - now;
      
      console.log(
        `[RATE LIMIT EXCEEDED] User: ${userId}, Role: ${userRole}, Endpoint: ${endpoint}, Limit: ${config.limit}/${config.window}s`
      );
      
      return {
        ...result,
        retryAfter: Math.max(0, retryAfter),
      };
    }
    
    // Increment counter
    await incrementRateLimit(userId, endpoint, config.window);
    
    return result;
  } catch (error) {
    console.error("[RATE LIMIT ERROR] Middleware failed:", error);
    
    // On error, allow the request (fail open for better UX)
    return {
      allowed: true,
      remaining: 100,
      resetAt: Math.floor(Date.now() / 1000) + 900,
      limit: 100,
    };
  }
}

/**
 * Get rate limit configuration for user role
 */
function getRateLimitConfig(
  userRole: string,
  limitType: keyof typeof RATE_LIMITS
): { limit: number; window: number } {
  const limits = RATE_LIMITS[limitType];
  
  // Normalize role
  const role = userRole.toLowerCase();
  
  if (role === "admin" && limits.admin) {
    return limits.admin;
  } else if ((role === "school" || role === "institute" || role === "institution") && limits.school) {
    return limits.school;
  } else if (role === "teacher" && limits.teacher) {
    return limits.teacher;
  } else if (limits.student) {
    return limits.student;
  }
  
  // Default fallback
  return { limit: 100, window: 900 };
}

/**
 * Check if user is rate limited (without incrementing)
 */
export async function isRateLimited(
  userId: string,
  userRole: string,
  endpoint: string,
  limitType: keyof typeof RATE_LIMITS = "GENERAL"
): Promise<boolean> {
  try {
    const config = getRateLimitConfig(userRole, limitType);
    const result = await checkRateLimit(userId, endpoint, config.limit, config.window);
    return !result.allowed;
  } catch (error) {
    console.error("[RATE LIMIT ERROR] Check failed:", error);
    return false; // Fail open
  }
}

/**
 * Get current rate limit status for user
 */
export async function getRateLimitStatus(
  userId: string,
  userRole: string,
  endpoint: string,
  limitType: keyof typeof RATE_LIMITS = "GENERAL"
): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetAt: number;
  window: number;
}> {
  try {
    const config = getRateLimitConfig(userRole, limitType);
    const info = await getRateLimitInfo(userId, endpoint, config.limit);
    
    return {
      current: info.current,
      limit: info.limit,
      remaining: info.remaining,
      resetAt: Math.floor(Date.now() / 1000) + config.window,
      window: config.window,
    };
  } catch (error) {
    console.error("[RATE LIMIT ERROR] Get status failed:", error);
    const config = getRateLimitConfig(userRole, limitType);
    return {
      current: 0,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Math.floor(Date.now() / 1000) + config.window,
      window: config.window,
    };
  }
}

/**
 * Format rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
    ...(result.retryAfter !== undefined && {
      "Retry-After": String(result.retryAfter),
    }),
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(result: RateLimitResult): {
  error: string;
  message: string;
  retryAfter: number;
  limit: number;
  resetAt: number;
} {
  return {
    error: "Rate limit exceeded",
    message: `You have exceeded the rate limit. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter || 0,
    limit: result.limit,
    resetAt: result.resetAt,
  };
}
