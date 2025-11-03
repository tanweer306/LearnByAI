import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheHelpers, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

// GET - Fetch all users with caching
export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.USER}all`;
    const cachedUsers = await cacheHelpers.get(cacheKey);
    
    if (cachedUsers) {
      return NextResponse.json({ users: cachedUsers, cached: true });
    }

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, role, user_type, created_at, onboarding_completed, total_books_uploaded")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Cache the results
    await cacheHelpers.set(cacheKey, users, CACHE_TTL.MEDIUM);

    return NextResponse.json({ users: users || [], cached: false });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, first_name, last_name, role, user_type } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        first_name,
        last_name,
        role,
        user_type: user_type || null,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.USER}*`);

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, first_name, last_name, role, user_type } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (role) updateData.role = role;
    if (user_type !== undefined) updateData.user_type = user_type;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.USER}*`);

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
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
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.USER}*`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
