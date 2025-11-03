import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheHelpers, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

// GET - Fetch all books with caching
export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    const cacheKey = `${CACHE_KEYS.BOOK}all`;
    const cachedBooks = await cacheHelpers.get(cacheKey);
    
    if (cachedBooks) {
      return NextResponse.json({ books: cachedBooks, cached: true });
    }

    const { data: books, error } = await supabaseAdmin
      .from("books")
      .select(`
        id,
        title,
        file_type,
        status,
        created_at,
        total_pages,
        uploaded_by_role,
        user_id,
        users!inner(email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to flatten the user email
    const transformedBooks = books?.map((book: any) => ({
      id: book.id,
      title: book.title,
      file_type: book.file_type,
      status: book.status,
      created_at: book.created_at,
      total_pages: book.total_pages,
      uploaded_by_role: book.uploaded_by_role || "unknown",
      user_email: book.users?.email || "Unknown",
    }));

    // Cache the results
    await cacheHelpers.set(cacheKey, transformedBooks, CACHE_TTL.MEDIUM);

    return NextResponse.json({ books: transformedBooks || [], cached: false });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// PUT - Update book
export async function PUT(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status;

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.BOOK}*`);

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    console.error("Error updating book:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update book" },
      { status: 500 }
    );
  }
}

// DELETE - Delete book
export async function DELETE(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("books")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.BOOK}*`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete book" },
      { status: 500 }
    );
  }
}
