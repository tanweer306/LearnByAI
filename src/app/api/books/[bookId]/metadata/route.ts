import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections } from "@/lib/mongodb";

export const runtime = "nodejs";

/**
 * GET /api/books/[bookId]/metadata
 * Get book metadata including chapters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get book metadata from MongoDB
    const metadata = await db
      .collection(Collections.BOOKS_METADATA)
      .findOne({ book_id: bookId });

    if (!metadata) {
      return NextResponse.json(
        { error: "Book metadata not found" },
        { status: 404 }
      );
    }

    // Extract chapters if available (from outline or detected headings)
    const chapters = metadata.chapters || [];

    return NextResponse.json({
      title: metadata.metadata?.title || metadata.title,
      author: metadata.metadata?.author,
      subject: metadata.metadata?.subject,
      total_pages: metadata.total_pages,
      chapters: chapters,
    });
  } catch (error) {
    console.error("Error fetching book metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch book metadata" },
      { status: 500 }
    );
  }
}
