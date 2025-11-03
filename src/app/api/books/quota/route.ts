/**
 * GET /api/books/quota
 * Fetch user's book upload quota (lifetime limit)
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserLimits } from "@/lib/utils/limit-checker";
import { getUsagePercentage, formatLimit } from "@/lib/config/feature-limits";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get userId from query params (for admin/teacher viewing other users)
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId");

    // For now, only allow users to view their own quota
    // TODO: Add admin/teacher permission checks
    
    // Get user limits from database
    const limits = await getUserLimits(clerkUserId);

    if (!limits) {
      return NextResponse.json(
        { error: "Unable to fetch user limits" },
        { status: 500 }
      );
    }

    const {
      totalBooksUploaded,
      booksUploadLimit,
      role,
      subscriptionType,
    } = limits;

    const remaining = Math.max(0, booksUploadLimit - totalBooksUploaded);
    const percentage = getUsagePercentage(totalBooksUploaded, booksUploadLimit);
    const canUpload = totalBooksUploaded < booksUploadLimit;

    return NextResponse.json({
      current: totalBooksUploaded,
      limit: booksUploadLimit,
      remaining,
      percentage,
      canUpload,
      planName: subscriptionType,
      role,
      limitType: "lifetime",
      message: canUpload
        ? `You have ${remaining} ${remaining === 1 ? "book" : "books"} remaining`
        : `You have reached your lifetime book upload limit of ${formatLimit(booksUploadLimit)}`,
    });
  } catch (error) {
    console.error("Error fetching book quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 }
    );
  }
}
