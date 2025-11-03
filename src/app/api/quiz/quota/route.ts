/**
 * GET /api/quiz/quota
 * Get user's quiz generation quota (monthly limit)
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserLimits } from "@/lib/utils/limit-checker";
import { getFeatureLimits, getUsagePercentage } from "@/lib/config/feature-limits";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user limits from database
    const limits = await getUserLimits(clerkUserId);

    if (!limits) {
      return NextResponse.json(
        { error: "Unable to fetch user limits" },
        { status: 500 }
      );
    }

    const {
      quizzesGeneratedThisMonth,
      role,
      subscriptionType,
    } = limits;

    const featureLimits = getFeatureLimits(role as any, subscriptionType);
    const monthlyLimit = featureLimits.monthly_quizzes;

    const remaining = Math.max(0, monthlyLimit - quizzesGeneratedThisMonth);
    const percentage = getUsagePercentage(quizzesGeneratedThisMonth, monthlyLimit);
    const canGenerate = quizzesGeneratedThisMonth < monthlyLimit;

    return NextResponse.json({
      current: quizzesGeneratedThisMonth,
      limit: monthlyLimit,
      remaining,
      percentage,
      canGenerate,
      planName: subscriptionType,
      role,
      limitType: "monthly",
      message: canGenerate
        ? `You have ${remaining} quiz ${remaining === 1 ? "generation" : "generations"} remaining this month`
        : `You have reached your monthly quiz generation limit of ${monthlyLimit}`,
    });
  } catch (error) {
    console.error("Error fetching quiz quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 }
    );
  }
}
