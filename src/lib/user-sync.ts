import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabase";

/**
 * Ensure the current Clerk user exists in Supabase
 * This is a fallback in case the webhook fails
 */
export async function ensureUserInSupabase() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    // Check if user exists in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUser.id)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // User doesn't exist, create them
    console.log("User not found in Supabase, creating:", clerkUser.id);

    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert({
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        first_name: clerkUser.firstName || null,
        last_name: clerkUser.lastName || null,
        role: "student",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user in Supabase:", error);
      throw error;
    }

    console.log("User created in Supabase:", newUser);
    return newUser;
  } catch (error) {
    console.error("Error in ensureUserInSupabase:", error);
    return null;
  }
}

/**
 * Get user from Supabase by Clerk ID
 */
export async function getUserFromSupabase(clerkUserId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error) {
      console.error("Error fetching user from Supabase:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserFromSupabase:", error);
    return null;
  }
}
