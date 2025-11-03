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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get submission with questions
    const { data: submission } = await supabaseAdmin
      .from("assignment_submissions")
      .select(`
        *,
        assignments(
          *,
          assignment_questions(*)
        )
      `)
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const answers = JSON.parse(submission.answers || "{}");
    const questions = submission.assignments.assignment_questions;
    
    let totalScore = 0;
    const questionGrades = [];

    for (const question of questions) {
      const studentAnswer = answers[question.id];
      let isCorrect: boolean | null = null;
      let pointsEarned = 0;

      // Auto-grade objective questions
      if (question.question_type === 'mcq' || question.question_type === 'true_false') {
        isCorrect = studentAnswer === question.correct_answer;
        pointsEarned = isCorrect ? question.points : 0;
      }
      // Subjective questions need manual/AI grading
      else if (question.question_type === 'short_answer' || question.question_type === 'long_answer') {
        // Mark as needs manual grading
        pointsEarned = 0;
      }

      totalScore += pointsEarned;

      questionGrades.push({
        submission_id: submissionId,
        question_id: question.id,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        points_possible: question.points,
        grading_method: 'auto',
      });
    }

    // Insert question grades
    await supabaseAdmin
      .from("assignment_question_grades")
      .insert(questionGrades);

    // Update submission
    await supabaseAdmin
      .from("assignment_submissions")
      .update({
        score: totalScore,
        status: 'graded',
        graded_at: new Date().toISOString(),
        grading_method: 'auto',
      })
      .eq("id", submissionId);

    return NextResponse.json({
      success: true,
      score: totalScore,
      totalPoints: submission.assignments.total_points,
    });
  } catch (error) {
    console.error("Error auto-grading:", error);
    return NextResponse.json({ error: "Failed to grade" }, { status: 500 });
  }
}