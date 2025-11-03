import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheHelpers, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

// GET - Fetch all institutions with caching
export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    const cacheKey = `${CACHE_KEYS.USER}institutions`;
    const cachedInstitutions = await cacheHelpers.get(cacheKey);
    
    if (cachedInstitutions) {
      return NextResponse.json({ institutions: cachedInstitutions, cached: true });
    }

    const { data: institutions, error } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, institution_name, created_at, user_type, role")
      .eq("user_type", "institution")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Cache the results
    await cacheHelpers.set(cacheKey, institutions, CACHE_TTL.MEDIUM);

    return NextResponse.json({ institutions: institutions || [], cached: false });
  } catch (error) {
    console.error("Error fetching institutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch institutions" },
      { status: 500 }
    );
  }
}

// POST - Create new institution
export async function POST(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, first_name, last_name, institution_name } = body;

    if (!email || !institution_name) {
      return NextResponse.json(
        { error: "Email and institution name are required" },
        { status: 400 }
      );
    }

    const { data: institution, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        first_name,
        last_name,
        institution_name,
        role: "admin",
        user_type: "institution",
        onboarding_completed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.delPattern(`${CACHE_KEYS.USER}*`);

    return NextResponse.json({ success: true, institution });
  } catch (error: any) {
    console.error("Error creating institution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create institution" },
      { status: 500 }
    );
  }
}

// PUT - Update institution
export async function PUT(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, first_name, last_name, institution_name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (institution_name) updateData.institution_name = institution_name;

    const { data: institution, error } = await supabaseAdmin
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

    return NextResponse.json({ success: true, institution });
  } catch (error: any) {
    console.error("Error updating institution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update institution" },
      { status: 500 }
    );
  }
}

// DELETE - Delete institution
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
        { error: "Institution ID is required" },
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
    console.error("Error deleting institution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete institution" },
      { status: 500 }
    );
  }
}
