/**
 * POST /api/referral/generate
 * Generate a referral/discount link for teachers or institutes
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

interface GenerateLinkRequest {
  userId: string;
  userRole: "teacher" | "institute";
  linkType: "teacher_class" | "institution" | "special_promo";
  classId?: string;
  discountPercentage: number;
  maxUses?: number;
  expiryDays?: number;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GenerateLinkRequest = await request.json();
    const {
      userId,
      userRole,
      linkType,
      classId,
      discountPercentage,
      maxUses,
      expiryDays,
      description,
    } = body;

    // Validate inputs
    if (!userId || !userRole || !linkType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json(
        { error: "Discount percentage must be between 0 and 100" },
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

    // Verify user has permission to create links
    if (userRole === "teacher" && user.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create teacher links" },
        { status: 403 }
      );
    }

    if (userRole === "institute" && user.role !== "institute") {
      return NextResponse.json(
        { error: "Only institutes can create institute links" },
        { status: 403 }
      );
    }

    // Check if user has active subscription with discount privileges
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "Active subscription required to generate links" },
        { status: 403 }
      );
    }

    // For free subscriptions (100% discount), check seat availability
    if (discountPercentage === 100 && userRole === "institute") {
      const availableSeats = subscription.available_seats || 0;
      if (availableSeats <= 0) {
        return NextResponse.json(
          { error: "No available seats. Please upgrade your plan." },
          { status: 403 }
        );
      }
    }

    // Generate unique link code
    const linkCode = nanoid(12); // e.g., "V1StGXR8_Z5j"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const linkUrl = `${baseUrl}/signup?ref=${linkCode}`;

    // Calculate expiry date
    let expiresAt = null;
    if (expiryDays && expiryDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryDays);
      expiresAt = expiry.toISOString();
    }

    // Create referral link in database
    const { data: link, error: linkError } = await supabaseAdmin
      .from("subscription_links")
      .insert({
        link_code: linkCode,
        link_type: linkType,
        created_by: user.id,
        teacher_id: userRole === "teacher" ? user.id : null,
        class_id: classId || null,
        institution_id: userRole === "institute" ? user.id : null,
        discount_percentage: discountPercentage,
        max_uses: maxUses || null,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        valid_until: expiresAt,
        is_active: true,
        description: description || null,
      })
      .select()
      .single();

    if (linkError) {
      console.error("Error creating referral link:", linkError);
      return NextResponse.json(
        { error: "Failed to create referral link" },
        { status: 500 }
      );
    }

    console.log(`✅ Referral link created: ${linkCode} by ${user.email}`);

    return NextResponse.json({
      success: true,
      link: {
        linkCode: link.link_code,
        linkUrl,
        discountPercentage: link.discount_percentage,
        linkType: link.link_type,
        maxUses: link.max_uses,
        expiresAt: link.valid_until,
        description: link.description,
      },
    });
  } catch (error) {
    console.error("Error generating referral link:", error);
    return NextResponse.json(
      { error: "Failed to generate referral link" },
      { status: 500 }
    );
  }
}
