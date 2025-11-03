/**
 * GET /api/study-plan/[planId]
 * Get study plan details with progress
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planId = params.planId;

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get study plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("study_plans")
      .select(`
        *,
        books:book_id (
          id,
          title
        )
      `)
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Study plan not found" }, { status: 404 });
    }

    // Verify user owns the plan
    if (plan.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this study plan" },
        { status: 403 }
      );
    }

    // Fetch tasks for this plan
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("study_plan_tasks")
      .select("*")
      .eq("study_plan_id", planId)
      .order("due_date");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
    }

    const allTasks = tasks || [];
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: plan.start_date,
        endDate: plan.end_date,
        status: plan.status,
        book: plan.books,
        createdAt: plan.created_at,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      tasks: allTasks,
    });
  } catch (error) {
    console.error("Error fetching study plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch study plan" },
      { status: 500 }
    );
  }
}
