/**
 * GET /api/referral/validate?code={linkCode}
 * Validate a referral link and return discount information
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const linkCode = searchParams.get("code");

    if (!linkCode) {
      return NextResponse.json(
        { error: "Link code is required" },
        { status: 400 }
      );
    }

    // Fetch link from database
    const { data: link, error: linkError } = await supabaseAdmin
      .from("subscription_links")
      .select("*")
      .eq("link_code", linkCode)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid referral code",
        },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json({
        valid: false,
        error: "This referral link has been deactivated",
        reason: "inactive",
      });
    }

    // Check if expired
    if (link.valid_until) {
      const expiryDate = new Date(link.valid_until);
      if (expiryDate < new Date()) {
        return NextResponse.json({
          valid: false,
          error: "This referral link has expired",
          reason: "expired",
          expiredOn: link.valid_until,
        });
      }
    }

    // Check if max uses reached
    if (link.max_uses && link.current_uses >= link.max_uses) {
      return NextResponse.json({
        valid: false,
        error: "This referral link has reached its maximum number of uses",
        reason: "max_uses_reached",
        maxUses: link.max_uses,
      });
    }

    // For institute free links, check seat availability
    if (link.discount_percentage === 100 && link.institution_id) {
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("total_seats, used_seats, available_seats")
        .eq("user_id", link.institution_id)
        .eq("status", "active")
        .single();

      if (subscription && subscription.available_seats <= 0) {
        return NextResponse.json({
          valid: false,
          error: "No seats available for this institution",
          reason: "no_seats",
        });
      }
    }

    // Get creator information
    const { data: creator } = await supabaseAdmin
      .from("users")
      .select("first_name, last_name, email, role")
      .eq("id", link.created_by)
      .single();

    // Link is valid
    return NextResponse.json({
      valid: true,
      link: {
        id: link.id,
        linkCode: link.link_code,
        linkType: link.link_type,
        discountPercentage: link.discount_percentage,
        description: link.description,
        customMessage: link.custom_message,
        teacherId: link.teacher_id,
        classId: link.class_id,
        institutionId: link.institution_id,
        expiresAt: link.valid_until,
        remainingUses: link.max_uses
          ? link.max_uses - link.current_uses
          : null,
      },
      creator: creator
        ? {
            name: `${creator.first_name || ""} ${creator.last_name || ""}`.trim(),
            email: creator.email,
            role: creator.role,
          }
        : null,
      discount: {
        percentage: link.discount_percentage,
        isFree: link.discount_percentage === 100,
        message:
          link.discount_percentage === 100
            ? "Free subscription included!"
            : `${link.discount_percentage}% discount applied!`,
      },
    });
  } catch (error) {
    console.error("Error validating referral link:", error);
    return NextResponse.json(
      { error: "Failed to validate referral link" },
      { status: 500 }
    );
  }
}
