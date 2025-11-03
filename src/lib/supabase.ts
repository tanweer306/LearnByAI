import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Database types
export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "student" | "teacher" | "admin";
  user_type: "student" | "teacher" | "institution" | null;
  onboarding_completed: boolean;
  country: string | null;
  timezone: string | null;
  language_preference: string;
  phone_number: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  // Student fields
  grade_level: string | null;
  school_name: string | null;
  student_id: string | null;
  // Teacher fields
  subjects: string[] | null;
  years_of_experience: number | null;
  qualification: string | null;
  teaching_level: string | null;
  // Institution fields
  institution_name: string | null;
  institution_type: string | null;
  institution_size: string | null;
  contact_person_name: string | null;
  contact_person_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  file_type: string;
  subject: string | null;
  grade_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  total_questions: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}
