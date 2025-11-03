/**
 * GET /api/referral/list
 * List all referral links created by the current user
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fetch all links created by this user
    const { data: links, error: linksError } = await supabaseAdmin
      .from("subscription_links")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error("Error fetching links:", linksError);
      return NextResponse.json(
        { error: "Failed to fetch links" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      links: links || [],
    });
  } catch (error) {
    console.error("Error listing referral links:", error);
    return NextResponse.json(
      { error: "Failed to list referral links" },
      { status: 500 }
    );
  }
}
