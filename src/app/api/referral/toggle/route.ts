/**
 * POST /api/referral/toggle
 * Toggle active status of a referral link
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { linkId, isActive } = await request.json();

    if (!linkId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify link belongs to this user
    const { data: link, error: linkError } = await supabaseAdmin
      .from("subscription_links")
      .select("*")
      .eq("id", linkId)
      .eq("created_by", user.id)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Link not found or access denied" },
        { status: 404 }
      );
    }

    // Update link status
    const { error: updateError } = await supabaseAdmin
      .from("subscription_links")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", linkId);

    if (updateError) {
      console.error("Error updating link:", updateError);
      return NextResponse.json(
        { error: "Failed to update link" },
        { status: 500 }
      );
    }

    console.log(`✅ Link ${linkId} ${isActive ? "activated" : "deactivated"}`);

    return NextResponse.json({
      success: true,
      message: `Link ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Error toggling referral link:", error);
    return NextResponse.json(
      { error: "Failed to toggle referral link" },
      { status: 500 }
    );
  }
}
