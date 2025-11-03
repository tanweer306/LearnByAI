/**
 * GET /api/study-plan/list
 * List all study plans for the current user
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

    // Fetch all study plans for this user
    const { data: plans, error: plansError } = await supabaseAdmin
      .from("study_plans")
      .select(`
        *,
        books:book_id (
          id,
          title
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (plansError) {
      console.error("Error fetching study plans:", plansError);
      return NextResponse.json(
        { error: "Failed to fetch study plans" },
        { status: 500 }
      );
    }

    // Get task counts for each plan
    const plansWithTasks = await Promise.all(
      (plans || []).map(async (plan) => {
        const { data: tasks } = await supabaseAdmin
          .from("study_plan_tasks")
          .select("id, completed")
          .eq("study_plan_id", plan.id);

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.completed).length || 0;

        return {
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
        };
      })
    );

    // Get today's tasks
    const today = new Date().toISOString().split('T')[0];
    const { data: todaysTasks } = await supabaseAdmin
      .from("study_plan_tasks")
      .select(`
        *,
        study_plans!inner(
          id,
          title,
          user_id
        )
      `)
      .eq("study_plans.user_id", user.id)
      .eq("due_date", today)
      .order("task_type");

    // Get streak data
    const { data: streak } = await supabaseAdmin
      .from("study_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      plans: plansWithTasks,
      todaysTasks: todaysTasks || [],
      streak: streak || { current_streak: 0, longest_streak: 0 },
    });
  } catch (error) {
    console.error("Error listing study plans:", error);
    return NextResponse.json(
      { error: "Failed to list study plans" },
      { status: 500 }
    );
  }
}
