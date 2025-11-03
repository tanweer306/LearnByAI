/**
 * POST /api/referral/redeem
 * Redeem a referral link after successful signup
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { consumeInstituteSeat } from "@/lib/utils/limit-checker";

export const runtime = "nodejs";

interface RedeemRequest {
  linkCode: string;
  userId?: string; // Optional: for admin redemptions
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: RedeemRequest = await request.json();
    const { linkCode, userId: targetUserId } = body;

    if (!linkCode) {
      return NextResponse.json(
        { error: "Link code is required" },
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

    // Fetch and validate link
    const { data: link, error: linkError } = await supabaseAdmin
      .from("subscription_links")
      .select("*")
      .eq("link_code", linkCode)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    // Validate link is still active and usable
    if (!link.is_active) {
      return NextResponse.json(
        { error: "This referral link has been deactivated" },
        { status: 400 }
      );
    }

    if (link.valid_until && new Date(link.valid_until) < new Date()) {
      return NextResponse.json(
        { error: "This referral link has expired" },
        { status: 400 }
      );
    }

    if (link.max_uses && link.current_uses >= link.max_uses) {
      return NextResponse.json(
        { error: "This referral link has reached its maximum uses" },
        { status: 400 }
      );
    }

    // Check if user already redeemed this link
    const { data: existingRedemption } = await supabaseAdmin
      .from("subscription_coverage")
      .select("*")
      .eq("student_id", user.id)
      .eq("teacher_id", link.teacher_id)
      .eq("institution_id", link.institution_id)
      .single();

    if (existingRedemption) {
      return NextResponse.json(
        { error: "You have already redeemed this referral link" },
        { status: 400 }
      );
    }

    // For institute free links, check and consume seat
    if (link.discount_percentage === 100 && link.institution_id) {
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("total_seats, used_seats, available_seats")
        .eq("user_id", link.institution_id)
        .eq("status", "active")
        .single();

      if (!subscription || subscription.available_seats <= 0) {
        return NextResponse.json(
          { error: "No seats available for this institution" },
          { status: 400 }
        );
      }

      // Consume a seat
      const seatConsumed = await consumeInstituteSeat(link.institution_id);
      if (!seatConsumed) {
        return NextResponse.json(
          { error: "Failed to allocate seat" },
          { status: 500 }
        );
      }
    }

    // Create subscription coverage record
    const coverageData: any = {
      student_id: user.id,
      covered_by_type: link.link_type === "teacher_class" ? "teacher" : "institution",
      teacher_id: link.teacher_id || null,
      class_id: link.class_id || null,
      institution_id: link.institution_id || null,
      discount_applied: link.discount_percentage,
      is_active: true,
      starts_at: new Date().toISOString(),
    };

    const { data: coverage, error: coverageError } = await supabaseAdmin
      .from("subscription_coverage")
      .insert(coverageData)
      .select()
      .single();

    if (coverageError) {
      console.error("Error creating subscription coverage:", coverageError);
      return NextResponse.json(
        { error: "Failed to apply referral discount" },
        { status: 500 }
      );
    }

    // Increment link usage count
    const { error: updateError } = await supabaseAdmin
      .from("subscription_links")
      .update({
        current_uses: link.current_uses + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    if (updateError) {
      console.error("Error updating link usage:", updateError);
    }

    console.log(`✅ Referral link redeemed: ${linkCode} by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Referral link redeemed successfully",
      redemption: {
        coverageId: coverage.id,
        discountPercentage: link.discount_percentage,
        isFree: link.discount_percentage === 100,
        coveredBy: coverageData.covered_by_type,
        teacherId: link.teacher_id,
        institutionId: link.institution_id,
      },
    });
  } catch (error) {
    console.error("Error redeeming referral link:", error);
    return NextResponse.json(
      { error: "Failed to redeem referral link" },
      { status: 500 }
    );
  }
}
