-- Migration: Add Institute Role and Lifetime Book Limits
-- Date: 2025-10-18
-- Description: Updates schema to support Institute user type and lifetime book tracking

-- ============================================================================
-- STEP 1: Add 'institute' role to users table
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'institute' role
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'institute'::text, 'admin'::text]));

-- ============================================================================
-- STEP 2: Add lifetime book tracking fields to users table
-- ============================================================================

-- Add columns for book upload tracking
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS total_books_uploaded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS books_upload_limit INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for institution relationships
CREATE INDEX IF NOT EXISTS idx_users_institution ON public.users(institution_id);

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- STEP 3: Add monthly usage tracking fields to users table
-- ============================================================================

-- Track monthly limits (reset each month)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS quizzes_generated_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_queries_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_monthly_reset DATE DEFAULT CURRENT_DATE;

-- ============================================================================
-- STEP 4: Update subscriptions table for seat tracking
-- ============================================================================

-- Add seat tracking for institutions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS total_seats INTEGER,
  ADD COLUMN IF NOT EXISTS used_seats INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_seats INTEGER GENERATED ALWAYS AS (total_seats - used_seats) STORED;

-- ============================================================================
-- STEP 5: Create function to set book limits based on subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION set_book_upload_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Set book upload limits based on role and subscription type
  IF NEW.role = 'student' THEN
    IF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%premium%'
    ) THEN
      NEW.books_upload_limit := 10;
    ELSE
      NEW.books_upload_limit := 3;
    END IF;
  ELSIF NEW.role = 'teacher' THEN
    IF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%premium%'
    ) THEN
      NEW.books_upload_limit := 50;
    ELSE
      NEW.books_upload_limit := 5;
    END IF;
  ELSIF NEW.role = 'institute' THEN
    -- Institute limits based on subscription package
    IF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%enterprise%'
    ) THEN
      NEW.books_upload_limit := 999999; -- Unlimited
    ELSIF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%large%'
    ) THEN
      NEW.books_upload_limit := 1000;
    ELSIF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%medium%'
    ) THEN
      NEW.books_upload_limit := 500;
    ELSIF EXISTS (
      SELECT 1 FROM subscriptions s 
      JOIN pricing_plans p ON s.plan_id = p.id
      WHERE s.user_id = NEW.id 
        AND s.status = 'active'
        AND p.plan_name ILIKE '%small%'
    ) THEN
      NEW.books_upload_limit := 200;
    ELSE
      NEW.books_upload_limit := 20; -- Free tier
    END IF;
  ELSIF NEW.role = 'admin' THEN
    NEW.books_upload_limit := 999999; -- Unlimited
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set limits on user creation/update
DROP TRIGGER IF EXISTS trigger_set_book_upload_limit ON public.users;
CREATE TRIGGER trigger_set_book_upload_limit
  BEFORE INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_book_upload_limit();

-- ============================================================================
-- STEP 6: Create function to increment book count on upload
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_book_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment total_books_uploaded for the user
  UPDATE public.users
  SET total_books_uploaded = total_books_uploaded + 1
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment count on book upload
DROP TRIGGER IF EXISTS trigger_increment_book_count ON public.books;
CREATE TRIGGER trigger_increment_book_count
  AFTER INSERT ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION increment_book_count();

-- ============================================================================
-- STEP 7: Create function to reset monthly limits
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
  -- Reset monthly counters for all users if it's a new month
  UPDATE public.users
  SET 
    quizzes_generated_this_month = 0,
    ai_queries_this_month = 0,
    last_monthly_reset = CURRENT_DATE
  WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Update existing users with default limits
-- ============================================================================

-- Set limits for existing users based on their current role
UPDATE public.users
SET books_upload_limit = CASE
  WHEN role = 'student' THEN 3
  WHEN role = 'teacher' THEN 5
  WHEN role = 'admin' THEN 999999
  ELSE 3
END
WHERE books_upload_limit IS NULL OR books_upload_limit = 0;

-- Count existing books for each user
UPDATE public.users u
SET total_books_uploaded = (
  SELECT COUNT(*) FROM public.books b WHERE b.user_id = u.id
)
WHERE total_books_uploaded = 0;

-- ============================================================================
-- STEP 9: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.users.total_books_uploaded IS 'Lifetime count of books uploaded by this user (never resets)';
COMMENT ON COLUMN public.users.books_upload_limit IS 'Maximum number of books this user can upload (lifetime limit)';
COMMENT ON COLUMN public.users.quizzes_generated_this_month IS 'Number of quizzes generated this calendar month (resets monthly)';
COMMENT ON COLUMN public.users.ai_queries_this_month IS 'Number of AI queries made this calendar month (resets monthly)';
COMMENT ON COLUMN public.users.last_monthly_reset IS 'Date when monthly counters were last reset';
COMMENT ON COLUMN public.users.institution_id IS 'Reference to institution this user belongs to (for students/teachers under an institute)';

-- ============================================================================
-- STEP 10: Create view for subscription limits
-- ============================================================================

CREATE OR REPLACE VIEW user_subscription_limits AS
SELECT 
  u.id AS user_id,
  u.email,
  u.role,
  u.total_books_uploaded,
  u.books_upload_limit,
  u.books_upload_limit - u.total_books_uploaded AS books_remaining,
  u.quizzes_generated_this_month,
  u.ai_queries_this_month,
  u.institution_id,
  p.plan_name,
  s.status AS subscription_status,
  s.total_seats,
  s.used_seats,
  s.available_seats
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN public.pricing_plans p ON s.plan_id = p.id;

COMMENT ON VIEW user_subscription_limits IS 'Consolidated view of user subscription limits and usage';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
