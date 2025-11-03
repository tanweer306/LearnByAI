import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/books/public
 * Get all public books
 */
export async function GET(request: NextRequest) {
  try {
    const { data: books, error } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("is_public", true)
      .eq("status", "ready")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching public books:", error);
      return NextResponse.json(
        { error: "Failed to fetch public books" },
        { status: 500 }
      );
    }

    return NextResponse.json({ books: books || [] });
  } catch (error) {
    console.error("Error in public books API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
