import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

/**
 * POST /api/books/add-public
 * Add a public book to user's collection
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: "Book ID required" }, { status: 400 });
    }

    // Get the original public book
    const { data: originalBook, error: bookError } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("is_public", true)
      .single();

    if (bookError || !originalBook) {
      return NextResponse.json(
        { error: "Public book not found" },
        { status: 404 }
      );
    }

    // Check if user already has this book
    const { data: existingBook } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("user_id", user.id)
      .eq("original_book_id", bookId)
      .single();

    if (existingBook) {
      return NextResponse.json(
        { error: "You already have this book in your collection" },
        { status: 409 }
      );
    }

    // Create a reference to the public book for this user
    const newBookId = uuidv4();

    const { data: newBook, error: createError } = await supabaseAdmin
      .from("books")
      .insert({
        id: newBookId,
        user_id: user.id,
        title: originalBook.title,
        file_url: originalBook.file_url,
        file_type: originalBook.file_type,
        file_size: originalBook.file_size,
        subject: originalBook.subject,
        grade_level: originalBook.grade_level,
        description: originalBook.description,
        cover_image_url: originalBook.cover_image_url,
        total_pages: originalBook.total_pages,
        status: "ready", // Already processed
        access_type: "personal",
        is_public: false, // User's personal copy
        file_hash: originalBook.file_hash,
        original_book_id: bookId,
        is_duplicate: true,
        original_uploader_id: originalBook.user_id,
        mongodb_ref: originalBook.mongodb_ref,
        pinecone_namespace: originalBook.pinecone_namespace,
        s3_key: originalBook.s3_key,
        processed_at: originalBook.processed_at,
        uploaded_by_role: user.role || "student",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error adding public book:", createError);
      return NextResponse.json(
        { error: "Failed to add book to your collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      book: newBook,
      message: "Book added to your collection!",
    });
  } catch (error) {
    console.error("Error in add-public API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
