/**
 * GET /api/referral/analytics
 * Get analytics for referral links
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

    // Calculate overall statistics
    const totalLinks = links?.length || 0;
    const activeLinks = links?.filter((l) => l.is_active).length || 0;
    const totalRedemptions = links?.reduce((sum, l) => sum + (l.current_uses || 0), 0) || 0;

    // Calculate expired links
    const now = new Date();
    const expiredLinks = links?.filter(
      (l) => l.valid_until && new Date(l.valid_until) < now
    ).length || 0;

    // Calculate max uses reached
    const maxUsesReachedLinks = links?.filter(
      (l) => l.max_uses && l.current_uses >= l.max_uses
    ).length || 0;

    // Get redemptions by link type
    const redemptionsByType = links?.reduce((acc: any, link) => {
      const type = link.link_type;
      if (!acc[type]) {
        acc[type] = { count: 0, redemptions: 0 };
      }
      acc[type].count += 1;
      acc[type].redemptions += link.current_uses || 0;
      return acc;
    }, {});

    // Get top performing links
    const topLinks = [...(links || [])]
      .sort((a, b) => (b.current_uses || 0) - (a.current_uses || 0))
      .slice(0, 5)
      .map((link) => ({
        id: link.id,
        linkCode: link.link_code,
        description: link.description,
        discountPercentage: link.discount_percentage,
        currentUses: link.current_uses,
        maxUses: link.max_uses,
        createdAt: link.created_at,
      }));

    // Calculate average discount
    const totalDiscount = links?.reduce((sum, l) => sum + (l.discount_percentage || 0), 0) || 0;
    const averageDiscount = totalLinks > 0 ? Math.round(totalDiscount / totalLinks) : 0;

    // Get recent redemptions (from subscription_coverage)
    const { data: recentRedemptions } = await supabaseAdmin
      .from("subscription_coverage")
      .select(`
        id,
        student_id,
        discount_applied,
        starts_at,
        users:student_id (
          first_name,
          last_name,
          email
        )
      `)
      .or(`teacher_id.eq.${user.id},institution_id.eq.${user.id}`)
      .order("starts_at", { ascending: false })
      .limit(10);

    // Calculate conversion rate (if we have signup tracking)
    // For now, we'll use redemptions as conversions
    const conversionRate = totalLinks > 0 
      ? Math.round((totalRedemptions / totalLinks) * 100) 
      : 0;

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthLinks = links?.filter((l) => {
        const created = new Date(l.created_at);
        return created >= monthStart && created <= monthEnd;
      }) || [];

      const monthRedemptions = monthLinks.reduce((sum, l) => sum + (l.current_uses || 0), 0);

      monthlyTrend.push({
        month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        linksCreated: monthLinks.length,
        redemptions: monthRedemptions,
      });
    }

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalLinks,
          activeLinks,
          expiredLinks,
          maxUsesReachedLinks,
          totalRedemptions,
          averageDiscount,
          conversionRate,
        },
        redemptionsByType,
        topLinks,
        recentRedemptions: recentRedemptions?.map((r: any) => ({
          id: r.id,
          studentName: `${r.users?.first_name || ""} ${r.users?.last_name || ""}`.trim(),
          studentEmail: r.users?.email,
          discountApplied: r.discount_applied,
          redeemedAt: r.starts_at,
        })) || [],
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
