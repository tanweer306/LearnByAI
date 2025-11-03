import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheHelpers, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

// GET - Fetch all AI prompts with caching
export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    const cacheKey = "ai_prompts:all";
    const cachedPrompts = await cacheHelpers.get(cacheKey);
    
    if (cachedPrompts) {
      return NextResponse.json({ prompts: cachedPrompts, cached: true });
    }

    const { data: prompts, error } = await supabaseAdmin
      .from("ai_prompts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Cache the results
    await cacheHelpers.set(cacheKey, prompts, CACHE_TTL.LONG);

    return NextResponse.json({ prompts: prompts || [], cached: false });
  } catch (error) {
    console.error("Error fetching AI prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI prompts" },
      { status: 500 }
    );
  }
}

// POST - Create new AI prompt
export async function POST(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, prompt_text, category, is_active } = body;

    if (!name || !prompt_text) {
      return NextResponse.json(
        { error: "Name and prompt text are required" },
        { status: 400 }
      );
    }

    const { data: prompt, error } = await supabaseAdmin
      .from("ai_prompts")
      .insert({
        name,
        prompt_text,
        category: category || "general",
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("ai_prompts:all");

    return NextResponse.json({ success: true, prompt });
  } catch (error: any) {
    console.error("Error creating AI prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create AI prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update AI prompt
export async function PUT(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, prompt_text, category, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (prompt_text) updateData.prompt_text = prompt_text;
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: prompt, error } = await supabaseAdmin
      .from("ai_prompts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("ai_prompts:all");

    return NextResponse.json({ success: true, prompt });
  } catch (error: any) {
    console.error("Error updating AI prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update AI prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete AI prompt
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
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("ai_prompts")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("ai_prompts:all");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting AI prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete AI prompt" },
      { status: 500 }
    );
  }
}
