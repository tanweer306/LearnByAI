/**
 * Feature Limits Configuration
 * 
 * IMPORTANT: 
 * - Book limits are LIFETIME (never reset)
 * - Quiz/AI query limits are MONTHLY (reset each calendar month)
 */

export interface FeatureLimits {
  // Lifetime limits (never reset)
  lifetime_books: number;
  study_plans: number;
  
  // Monthly limits (reset each month)
  monthly_quizzes: number;
  ai_queries: number;
  
  // Additional features
  max_students_per_class?: number;
  max_classes?: number;
  can_offer_discount?: boolean;
  discount_percentage?: number;
}

export interface InstituteLimits extends FeatureLimits {
  total_seats: number;
  max_teachers: number;
}

// ============================================================================
// STUDENT PLANS
// ============================================================================

export const STUDENT_FREE: FeatureLimits = {
  lifetime_books: 3,
  monthly_quizzes: 10,
  ai_queries: 20,
  study_plans: 1,
};

export const STUDENT_PREMIUM: FeatureLimits = {
  lifetime_books: 10,
  monthly_quizzes: 100,
  ai_queries: 1000,
  study_plans: 10,
};

// ============================================================================
// TEACHER PLANS
// ============================================================================

export const TEACHER_FREE: FeatureLimits = {
  lifetime_books: 5,
  monthly_quizzes: 50,
  ai_queries: 100,
  study_plans: 5,
  max_students_per_class: 10,
  max_classes: 1,
  can_offer_discount: false,
};

export const TEACHER_PREMIUM: FeatureLimits = {
  lifetime_books: 50,
  monthly_quizzes: 500,
  ai_queries: 5000,
  study_plans: 50,
  max_students_per_class: 100,
  max_classes: 5,
  can_offer_discount: true,
  discount_percentage: 30,
};

// ============================================================================
// INSTITUTE PLANS
// ============================================================================

export const INSTITUTE_FREE: InstituteLimits = {
  lifetime_books: 20,
  monthly_quizzes: 100,
  ai_queries: 500,
  study_plans: 10,
  total_seats: 10,
  max_teachers: 1,
  can_offer_discount: true,
  discount_percentage: 100, // Can offer free subscriptions
};

export const INSTITUTE_SMALL: InstituteLimits = {
  lifetime_books: 200,
  monthly_quizzes: 1000,
  ai_queries: 10000,
  study_plans: 100,
  total_seats: 50,
  max_teachers: 2,
  can_offer_discount: true,
  discount_percentage: 100,
};

export const INSTITUTE_MEDIUM: InstituteLimits = {
  lifetime_books: 500,
  monthly_quizzes: 2500,
  ai_queries: 25000,
  study_plans: 250,
  total_seats: 200,
  max_teachers: 5,
  can_offer_discount: true,
  discount_percentage: 100,
};

export const INSTITUTE_LARGE: InstituteLimits = {
  lifetime_books: 1000,
  monthly_quizzes: 5000,
  ai_queries: 50000,
  study_plans: 500,
  total_seats: 500,
  max_teachers: 10,
  can_offer_discount: true,
  discount_percentage: 100,
};

export const INSTITUTE_ENTERPRISE: InstituteLimits = {
  lifetime_books: Infinity,
  monthly_quizzes: Infinity,
  ai_queries: Infinity,
  study_plans: Infinity,
  total_seats: Infinity,
  max_teachers: Infinity,
  can_offer_discount: true,
  discount_percentage: 100,
};

// ============================================================================
// ADMIN (Unlimited)
// ============================================================================

export const ADMIN_UNLIMITED: FeatureLimits = {
  lifetime_books: Infinity,
  monthly_quizzes: Infinity,
  ai_queries: Infinity,
  study_plans: Infinity,
};

// ============================================================================
// FEATURE LIMITS MAP
// ============================================================================

export const FEATURE_LIMITS: Record<string, FeatureLimits | InstituteLimits> = {
  // Student plans
  student_free: STUDENT_FREE,
  student_premium: STUDENT_PREMIUM,
  
  // Teacher plans
  teacher_free: TEACHER_FREE,
  teacher_premium: TEACHER_PREMIUM,
  
  // Institute plans
  institute_free: INSTITUTE_FREE,
  institute_small: INSTITUTE_SMALL,
  institute_medium: INSTITUTE_MEDIUM,
  institute_large: INSTITUTE_LARGE,
  institute_enterprise: INSTITUTE_ENTERPRISE,
  
  // Admin
  admin: ADMIN_UNLIMITED,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get feature limits for a user based on their role and subscription
 */
export function getFeatureLimits(
  role: 'student' | 'teacher' | 'institute' | 'admin',
  subscriptionType: string = 'free'
): FeatureLimits | InstituteLimits {
  const key = `${role}_${subscriptionType}`;
  return FEATURE_LIMITS[key] || FEATURE_LIMITS[`${role}_free`] || STUDENT_FREE;
}

/**
 * Check if a specific limit is infinity (unlimited)
 */
export function isUnlimited(limit: number): boolean {
  return limit === Infinity || limit >= 999999;
}

/**
 * Get user-friendly limit display
 */
export function formatLimit(limit: number): string {
  if (isUnlimited(limit)) {
    return 'Unlimited';
  }
  return limit.toString();
}

/**
 * Calculate remaining quota
 */
export function getRemainingQuota(used: number, limit: number): number {
  if (isUnlimited(limit)) {
    return Infinity;
  }
  return Math.max(0, limit - used);
}

/**
 * Check if user has reached limit
 */
export function hasReachedLimit(used: number, limit: number): boolean {
  if (isUnlimited(limit)) {
    return false;
  }
  return used >= limit;
}

/**
 * Get percentage used
 */
export function getUsagePercentage(used: number, limit: number): number {
  if (isUnlimited(limit)) {
    return 0;
  }
  return Math.min(100, (used / limit) * 100);
}

// ============================================================================
// PRICING (for reference)
// ============================================================================

export const PRICING = {
  student_free: { price: 0, period: 'forever' },
  student_premium: { price: 4.99, period: 'month' },
  
  teacher_free: { price: 0, period: 'forever' },
  teacher_premium: { price: 9.99, period: 'month' },
  
  institute_free: { price: 0, period: 'forever' },
  institute_small: { price: 49, period: 'month' },
  institute_medium: { price: 99, period: 'month' },
  institute_large: { price: 199, period: 'month' },
  institute_enterprise: { price: 'custom', period: 'month' },
};

export default FEATURE_LIMITS;
