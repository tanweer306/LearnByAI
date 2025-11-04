/**
 * POST /api/study-plan/[planId]/toggle-task
 * Toggle task completion status and update streak
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

interface ToggleTaskRequest {
  taskId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const body: ToggleTaskRequest = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
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

    // Get task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("study_plan_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("study_plan_id", planId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify ownership
    const { data: plan } = await supabaseAdmin
      .from("study_plans")
      .select("user_id")
      .eq("id", planId)
      .single();

    if (!plan || plan.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this study plan" },
        { status: 403 }
      );
    }

    // Toggle task completion
    const newCompletedState = !task.completed;
    const { error: updateError } = await supabaseAdmin
      .from("study_plan_tasks")
      .update({
        completed: newCompletedState,
        completed_at: newCompletedState ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task:", updateError);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    // Update streak if completing task
    let streakData = null;
    if (newCompletedState) {
      const today = new Date().toISOString().split('T')[0];

      const { data: streak } = await supabaseAdmin
        .from("study_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let currentStreak = 0;
      let longestStreak = 0;

      if (streak) {
        const lastStudyDate = streak.last_study_date;
        currentStreak = streak.current_streak || 0;
        longestStreak = streak.longest_streak || 0;

        if (lastStudyDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastStudyDate === yesterdayStr) {
            currentStreak++;
          } else if (lastStudyDate < yesterdayStr) {
            currentStreak = 1;
          }

          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }
        }
      } else {
        currentStreak = 1;
        longestStreak = 1;
      }

      await supabaseAdmin
        .from("study_streaks")
        .upsert({
          user_id: user.id,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_study_date: today,
          updated_at: new Date().toISOString(),
        });

      streakData = { current_streak: currentStreak, longest_streak: longestStreak };
    }

    // Get plan progress
    const { data: allTasks } = await supabaseAdmin
      .from("study_plan_tasks")
      .select("completed")
      .eq("study_plan_id", planId);

    const totalTasks = allTasks?.length || 0;
    const completedTasks = allTasks?.filter(t => t.completed).length || 0;

    // Update plan status if all completed
    if (completedTasks === totalTasks && totalTasks > 0) {
      await supabaseAdmin
        .from("study_plans")
        .update({ status: "completed" })
        .eq("id", planId);
    }

    return NextResponse.json({
      success: true,
      completed: newCompletedState,
      streak: streakData,
      planProgress: {
        completed: completedTasks,
        total: totalTasks,
        percentage: Math.round((completedTasks / totalTasks) * 100),
      },
    });
  } catch (error) {
    console.error("Error toggling task:", error);
    return NextResponse.json(
      { error: "Failed to toggle task" },
      { status: 500 }
    );
  }
}
