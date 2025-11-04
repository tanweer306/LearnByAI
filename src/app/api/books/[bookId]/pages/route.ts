import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookPage } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/books/[bookId]/pages
 * Get pages for a specific book
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await params;
    const { searchParams } = new URL(request.url);
    const pageNumber = searchParams.get("page");

    // Get user from Supabase
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify book belongs to user
    const { data: book } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (!book) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    const db = await getDatabase();

    // Get specific page or all pages
    if (pageNumber) {
      const page = await db
        .collection<BookPage>(Collections.BOOK_PAGES)
        .findOne({
          book_id: bookId,
          page_number: parseInt(pageNumber),
        });

      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      return NextResponse.json({ page });
    } else {
      // Get all pages (without embedding data to reduce size)
      const pages = await db
        .collection<BookPage>(Collections.BOOK_PAGES)
        .find({ book_id: bookId })
        .project({ embedding: 0 }) // Exclude embedding field
        .sort({ page_number: 1 })
        .toArray();

      return NextResponse.json({
        pages,
        totalPages: pages.length,
      });
    }
  } catch (error) {
    console.error("Error fetching book pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch book pages" },
      { status: 500 }
    );
  }
}
