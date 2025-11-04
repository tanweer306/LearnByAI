/**
 * Limit Checker Utilities
 * 
 * Functions to check if users can perform actions based on their subscription limits
 */

import { supabaseAdmin } from '@/lib/supabase';
import { getFeatureLimits, hasReachedLimit, isUnlimited } from '@/lib/config/feature-limits';

export interface UserLimits {
  userId: string;
  role: 'student' | 'teacher' | 'institute' | 'admin';
  subscriptionType: string;
  totalBooksUploaded: number;
  booksUploadLimit: number;
  quizzesGeneratedThisMonth: number;
  aiQueriesThisMonth: number;
  lastMonthlyReset: string;
}

// ============================================================================
// FETCH USER LIMITS
// ============================================================================

/**
 * Get current limits and usage for a user
 */
export async function getUserLimits(userId: string): Promise<UserLimits | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_subscription_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user limits:', error);
      return null;
    }

    return {
      userId: data.user_id,
      role: data.role,
      subscriptionType: data.plan_name?.toLowerCase().replace(/\s+/g, '_') || 'free',
      totalBooksUploaded: data.total_books_uploaded || 0,
      booksUploadLimit: data.books_upload_limit || 3,
      quizzesGeneratedThisMonth: data.quizzes_generated_this_month || 0,
      aiQueriesThisMonth: data.ai_queries_this_month || 0,
      lastMonthlyReset: data.last_monthly_reset,
    };
  } catch (error) {
    console.error('Error in getUserLimits:', error);
    return null;
  }
}

// ============================================================================
// BOOK UPLOAD LIMITS (LIFETIME)
// ============================================================================

/**
 * Check if user can upload a book (lifetime limit)
 * Now counts actual books in database instead of relying on counter
 */
export async function canUploadBook(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  remaining: number;
}> {
  const limits = await getUserLimits(userId);
  
  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch user limits',
      current: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Count actual books in database (more accurate than counter)
  const { count: actualBookCount, error: countError } = await supabaseAdmin
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('is_duplicate', 'eq', true); // Don't count duplicates from public library

  const totalBooksUploaded = countError ? limits.totalBooksUploaded : (actualBookCount || 0);
  const { booksUploadLimit } = limits;
  const remaining = Math.max(0, booksUploadLimit - totalBooksUploaded);
  const allowed = !hasReachedLimit(totalBooksUploaded, booksUploadLimit);

  return {
    allowed,
    reason: allowed ? undefined : `You have reached your lifetime book upload limit of ${booksUploadLimit} books`,
    current: totalBooksUploaded,
    limit: booksUploadLimit,
    remaining,
  };
}

/**
 * Increment book upload count (called after successful upload)
 */
export async function incrementBookCount(userId: string): Promise<boolean> {
  try {
    const { data: user, error: getErr } = await supabaseAdmin
      .from('users')
      .select('total_books_uploaded')
      .eq('id', userId)
      .single();

    if (getErr) {
      console.error('Error fetching current book count:', getErr);
      return false;
    }

    const current = user?.total_books_uploaded ?? 0;
    const { error } = await supabaseAdmin
      .from('users')
      .update({ total_books_uploaded: current + 1 })
      .eq('id', userId);

    if (error) {
      console.error('Error incrementing book count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementBookCount:', error);
    return false;
  }
}

// ============================================================================
// QUIZ GENERATION LIMITS (MONTHLY)
// ============================================================================

/**
 * Check if user can generate a quiz (monthly limit)
 */
export async function canGenerateQuiz(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  remaining: number;
}> {
  const limits = await getUserLimits(userId);
  
  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch user limits',
      current: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Check if monthly reset is needed
  await checkAndResetMonthlyLimits(userId, limits.lastMonthlyReset);

  const featureLimits = getFeatureLimits(limits.role, limits.subscriptionType);
  const monthlyLimit = featureLimits.monthly_quizzes;
  const current = limits.quizzesGeneratedThisMonth;
  const remaining = Math.max(0, monthlyLimit - current);
  const allowed = !hasReachedLimit(current, monthlyLimit);

  return {
    allowed,
    reason: allowed ? undefined : `You have reached your monthly quiz generation limit of ${monthlyLimit}`,
    current,
    limit: monthlyLimit,
    remaining,
  };
}

/**
 * Increment quiz generation count (called after successful generation)
 */
export async function incrementQuizCount(userId: string): Promise<boolean> {
  try {
    const { data: user, error: getErr } = await supabaseAdmin
      .from('users')
      .select('quizzes_generated_this_month')
      .eq('id', userId)
      .single();

    if (getErr) {
      console.error('Error fetching current quiz count:', getErr);
      return false;
    }

    const current = user?.quizzes_generated_this_month ?? 0;
    const { error } = await supabaseAdmin
      .from('users')
      .update({ quizzes_generated_this_month: current + 1 })
      .eq('id', userId);

    if (error) {
      console.error('Error incrementing quiz count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementQuizCount:', error);
    return false;
  }
}

// ============================================================================
// AI QUERY LIMITS (MONTHLY)
// ============================================================================

/**
 * Check if user can make an AI query (monthly limit)
 */
export async function canMakeAIQuery(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  remaining: number;
}> {
  const limits = await getUserLimits(userId);
  
  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch user limits',
      current: 0,
      limit: 0,
      remaining: 0,
    };
  }

  // Check if monthly reset is needed
  await checkAndResetMonthlyLimits(userId, limits.lastMonthlyReset);

  const featureLimits = getFeatureLimits(limits.role, limits.subscriptionType);
  const monthlyLimit = featureLimits.ai_queries;
  const current = limits.aiQueriesThisMonth;
  const remaining = Math.max(0, monthlyLimit - current);
  const allowed = !hasReachedLimit(current, monthlyLimit);

  return {
    allowed,
    reason: allowed ? undefined : `You have reached your monthly AI query limit of ${monthlyLimit}`,
    current,
    limit: monthlyLimit,
    remaining,
  };
}

/**
 * Increment AI query count (called after successful query)
 */
export async function incrementAIQueryCount(userId: string): Promise<boolean> {
  try {
    const { data: user, error: getErr } = await supabaseAdmin
      .from('users')
      .select('ai_queries_this_month')
      .eq('id', userId)
      .single();

    if (getErr) {
      console.error('Error fetching current AI queries count:', getErr);
      return false;
    }

    const current = user?.ai_queries_this_month ?? 0;
    const { error } = await supabaseAdmin
      .from('users')
      .update({ ai_queries_this_month: current + 1 })
      .eq('id', userId);

    if (error) {
      console.error('Error incrementing AI query count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementAIQueryCount:', error);
    return false;
  }
}

// ============================================================================
// MONTHLY RESET
// ============================================================================

/**
 * Check if monthly limits need to be reset and reset them if needed
 */
async function checkAndResetMonthlyLimits(
  userId: string,
  lastResetDate: string
): Promise<void> {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  // Check if we're in a new month
  const needsReset = 
    now.getMonth() !== lastReset.getMonth() || 
    now.getFullYear() !== lastReset.getFullYear();

  if (needsReset) {
    try {
      await supabaseAdmin
        .from('users')
        .update({
          quizzes_generated_this_month: 0,
          ai_queries_this_month: 0,
          last_monthly_reset: now.toISOString().split('T')[0],
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error resetting monthly limits:', error);
    }
  }
}

// ============================================================================
// INSTITUTE SEAT LIMITS
// ============================================================================

/**
 * Check if institute can add more students (seat limit)
 */
export async function canAddStudentToInstitute(instituteId: string): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  total: number;
  available: number;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('total_seats, used_seats, available_seats')
      .eq('user_id', instituteId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return {
        allowed: false,
        reason: 'No active subscription found',
        used: 0,
        total: 0,
        available: 0,
      };
    }

    const { total_seats, used_seats, available_seats } = data;
    
    // Check if unlimited
    if (isUnlimited(total_seats)) {
      return {
        allowed: true,
        used: used_seats || 0,
        total: total_seats,
        available: Infinity,
      };
    }

    const allowed = (available_seats || 0) > 0;

    return {
      allowed,
      reason: allowed ? undefined : `All ${total_seats} seats are currently in use`,
      used: used_seats || 0,
      total: total_seats,
      available: available_seats || 0,
    };
  } catch (error) {
    console.error('Error checking institute seats:', error);
    return {
      allowed: false,
      reason: 'Error checking seat availability',
      used: 0,
      total: 0,
      available: 0,
    };
  }
}

/**
 * Consume a seat when student joins institute
 */
export async function consumeInstituteSeat(instituteId: string): Promise<boolean> {
  try {
    const { data, error: getErr } = await supabaseAdmin
      .from('subscriptions')
      .select('used_seats')
      .eq('user_id', instituteId)
      .eq('status', 'active')
      .single();

    if (getErr) {
      console.error('Error fetching current used seats:', getErr);
      return false;
    }

    const current = data?.used_seats ?? 0;
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ used_seats: current + 1 })
      .eq('user_id', instituteId)
      .eq('status', 'active');

    if (error) {
      console.error('Error consuming institute seat:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in consumeInstituteSeat:', error);
    return false;
  }
}

/**
 * Release a seat when student leaves institute
 */
export async function releaseInstituteSeat(instituteId: string): Promise<boolean> {
  try {
    const { data, error: getErr } = await supabaseAdmin
      .from('subscriptions')
      .select('used_seats')
      .eq('user_id', instituteId)
      .eq('status', 'active')
      .single();

    if (getErr) {
      console.error('Error fetching current used seats:', getErr);
      return false;
    }

    const current = data?.used_seats ?? 0;
    const next = Math.max(current - 1, 0);
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ used_seats: next })
      .eq('user_id', instituteId)
      .eq('status', 'active');

    if (error) {
      console.error('Error releasing institute seat:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in releaseInstituteSeat:', error);
    return false;
  }
}

// ============================================================================
// TEACHER CLASS LIMITS
// ============================================================================

/**
 * Check if teacher can create more classes
 */
export async function canCreateClass(teacherId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}> {
  try {
    const limits = await getUserLimits(teacherId);
    
    if (!limits || limits.role !== 'teacher') {
      return {
        allowed: false,
        reason: 'Only teachers can create classes',
        current: 0,
        limit: 0,
      };
    }

    const featureLimits = getFeatureLimits(limits.role, limits.subscriptionType);
    const maxClasses = featureLimits.max_classes || 1;

    // Count current classes
    const { count, error } = await supabaseAdmin
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Error counting classes:', error);
      return {
        allowed: false,
        reason: 'Error checking class count',
        current: 0,
        limit: maxClasses,
      };
    }

    const current = count || 0;
    const allowed = !hasReachedLimit(current, maxClasses);

    return {
      allowed,
      reason: allowed ? undefined : `You have reached your class limit of ${maxClasses}`,
      current,
      limit: maxClasses,
    };
  } catch (error) {
    console.error('Error in canCreateClass:', error);
    return {
      allowed: false,
      reason: 'Error checking class limits',
      current: 0,
      limit: 0,
    };
  }
}

export default {
  getUserLimits,
  canUploadBook,
  incrementBookCount,
  canGenerateQuiz,
  incrementQuizCount,
  canMakeAIQuery,
  incrementAIQueryCount,
  canAddStudentToInstitute,
  consumeInstituteSeat,
  releaseInstituteSeat,
  canCreateClass,
};
