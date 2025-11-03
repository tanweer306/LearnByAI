import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: submissionId } = await params;
    const { grades, overallFeedback, totalScore } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher ID
    const { data: teacher } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get submission
    const { data: submission } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*, assignment:assignments(teacher_id)")
      .eq("id", submissionId)
      .single();

    if (!submission || submission.assignment.teacher_id !== teacher.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete existing grades
    await supabaseAdmin
      .from("assignment_question_grades")
      .delete()
      .eq("submission_id", submissionId);

    // Insert new grades
    const gradeRecords = Object.entries(grades).map(([questionId, grade]: [string, any]) => ({
      submission_id: submissionId,
      question_id: questionId,
      points_earned: grade.points,
      teacher_feedback: grade.feedback || null,
      grading_method: "manual",
      graded_by: teacher.id,
    }));

    await supabaseAdmin.from("assignment_question_grades").insert(gradeRecords);

    // Update submission
    await supabaseAdmin
      .from("assignment_submissions")
      .update({
        score: totalScore,
        status: "graded",
        graded_at: new Date().toISOString(),
        graded_by: teacher.id,
        grading_method: "manual",
        teacher_feedback: overallFeedback,
      })
      .eq("id", submissionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error manual grading:", error);
    return NextResponse.json({ error: "Failed to save grades" }, { status: 500 });
  }
}