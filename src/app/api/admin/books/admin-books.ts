import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/admin/books
 * Get all books (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and check if admin
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("clerk_user_id", userId)
      .single();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Get all books
    const { data: books, error } = await supabaseAdmin
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching books:", error);
      return NextResponse.json(
        { error: "Failed to fetch books" },
        { status: 500 }
      );
    }

    return NextResponse.json({ books: books || [] });
  } catch (error) {
    console.error("Error in admin books API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
