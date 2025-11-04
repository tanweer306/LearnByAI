import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/books/[id]
 * Update a book (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const bookId = id;
    const updates = await request.json();

    // Update book
    const { data: book, error } = await supabaseAdmin
      .from("books")
      .update(updates)
      .eq("id", bookId)
      .select()
      .single();

    if (error) {
      console.error("Error updating book:", error);
      return NextResponse.json(
        { error: "Failed to update book" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, book });
  } catch (error) {
    console.error("Error in admin update book API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/books/[id]
 * Delete a book (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const bookId = id;

    // Delete book
    const { error } = await supabaseAdmin
      .from("books")
      .delete()
      .eq("id", bookId);

    if (error) {
      console.error("Error deleting book:", error);
      return NextResponse.json(
        { error: "Failed to delete book" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error in admin delete book API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
