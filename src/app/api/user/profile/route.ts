// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id,
        role,
        email,
        first_name,
        last_name,
        preferred_language,
        subscription_status,
        subscription_tier,
        available_seats,
        can_offer_discount,
        max_discount_percentage
      `
      )
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      preferredLanguage: user.preferred_language ?? "en",
      subscriptionStatus: user.subscription_status,
      subscriptionTier: user.subscription_tier,
      availableSeats: user.available_seats ?? 0,
      canOfferDiscount: user.can_offer_discount ?? false,
      maxDiscountPercentage: user.max_discount_percentage ?? 30,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}