/**
 * GET /api/books/[bookId]/chapters
 * Get all chapters for a specific book from MongoDB
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBookMetadata, getBookPageCount } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await params;

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get book and verify access
    const { data: book, error: bookError } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Verify user owns the book or has access
    if (book.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Fetch chapters from MongoDB
    const metadata = await getBookMetadata(bookId);
    const totalPages = await getBookPageCount(bookId);

    if (!metadata) {
      return NextResponse.json({
        success: true,
        chapters: [],
        totalPages,
        hasChapters: false,
      });
    }

    // Transform MongoDB chapters to expected format
    const chapters = (metadata.chapters || []).map((ch, index) => ({
      id: `${bookId}_ch_${ch.chapter_number}`,
      chapter_number: ch.chapter_number,
      title: ch.title,
      start_page: ch.start_page,
      end_page: ch.end_page,
    }));

    return NextResponse.json({
      success: true,
      chapters,
      totalPages,
      hasChapters: chapters.length > 0,
    });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
