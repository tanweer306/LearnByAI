import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: userData, error } = await supabaseAdmin
    .from("users")
    .select("role, user_type, onboarding_completed")
    .eq("clerk_user_id", userId)
    .single();

  // If user doesn't exist in Supabase yet, redirect to onboarding
  if (error?.code === "PGRST116") {
    redirect("/onboarding");
  }

  // If there's an error other than not found, redirect to onboarding
  if (error) {
    console.error("Error fetching user data:", error);
    redirect("/onboarding");
  }

  // If user exists but hasn't completed onboarding
  if (userData && userData.onboarding_completed === false) {
    redirect("/onboarding");
  }

  // If user has completed onboarding or onboarding_completed is null (old users)
  if (userData) {
    // Redirect based on role and user_type
    if (userData.role === "teacher") {
      redirect("/dashboard/teacher");
    } else if (userData.role === "institute" || userData.user_type === "institution") {
      redirect("/dashboard/institution");
    } else if (userData.role === "student") {
      redirect("/dashboard/student");
    } else if (userData.role === "admin" && userData.user_type === "institution") {
      redirect("/dashboard/institution");
    } else {
      // Default to student dashboard for unknown roles
      redirect("/dashboard/student");
    }
  }

  // Fallback: redirect to onboarding
  redirect("/onboarding");
}
