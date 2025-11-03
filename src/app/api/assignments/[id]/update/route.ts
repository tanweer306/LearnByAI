import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: assignmentId } = await params;
    const { questions } = await req.json();

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

    // Verify ownership
    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select("id, teacher_id")
      .eq("id", assignmentId)
      .eq("teacher_id", teacher.id)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Delete existing questions
    await supabaseAdmin
      .from("assignment_questions")
      .delete()
      .eq("assignment_id", assignmentId);

    // Insert new questions
    const questionsToInsert = questions.map((q: any) => ({
      assignment_id: assignmentId,
      question_number: q.questionNumber,
      question_type: q.questionType,
      question_text: q.questionText,
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: q.correctAnswer || null,
      explanation: q.explanation || null,
      points: q.points || 10,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("assignment_questions")
      .insert(questionsToInsert);

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      return NextResponse.json({ error: "Failed to update questions" }, { status: 500 });
    }

    // Update total points
    const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
    await supabaseAdmin
      .from("assignments")
      .update({ total_points: totalPoints })
      .eq("id", assignmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}