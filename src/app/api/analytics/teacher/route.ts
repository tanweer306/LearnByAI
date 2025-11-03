import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: teacher } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get total assignments
    const { count: totalAssignments } = await supabaseAdmin
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacher.id);

    // Get total submissions
    const { data: submissions } = await supabaseAdmin
      .from("assignment_submissions")
      .select(`
        *,
        assignments!inner(teacher_id)
      `)
      .eq("assignments.teacher_id", teacher.id);

    const totalSubmissions = submissions?.length || 0;
    const pendingGrading = submissions?.filter(s => s.status === "submitted").length || 0;
    
    // Calculate average score
    const gradedSubmissions = submissions?.filter(s => s.status === "graded" && s.score !== null) || [];
    const averageScore = gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, s) => sum + (s.score / s.total_points) * 100, 0) /
            gradedSubmissions.length
        )
      : 0;

    // Get recent assignments with stats
    const { data: recentAssignments } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        assignment_submissions(id, status, score, total_points)
      `)
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const formattedAssignments = recentAssignments?.map(a => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      totalStudents: a.assignment_submissions?.length || 0,
      submissionCount: a.assignment_submissions?.filter((s: any) => s.status !== "draft").length || 0,
      averageScore: a.assignment_submissions?.filter((s: any) => s.status === "graded").length > 0
        ? Math.round(
            a.assignment_submissions
              .filter((s: any) => s.status === "graded")
              .reduce((sum: number, s: any) => sum + (s.score / s.total_points) * 100, 0) /
              a.assignment_submissions.filter((s: any) => s.status === "graded").length
          )
        : 0,
    }));

    // Get top performers (mock data for now - would need more complex query)
    const topPerformers = [
      { id: 1, name: "John Doe", email: "john@example.com", averageScore: 95, completedAssignments: 10 },
      { id: 2, name: "Jane Smith", email: "jane@example.com", averageScore: 92, completedAssignments: 9 },
      { id: 3, name: "Bob Johnson", email: "bob@example.com", averageScore: 88, completedAssignments: 8 },
    ];

    return NextResponse.json({
      success: true,
      analytics: {
        totalAssignments: totalAssignments || 0,
        totalSubmissions,
        pendingGrading,
        averageScore,
        recentAssignments: formattedAssignments,
        topPerformers,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}