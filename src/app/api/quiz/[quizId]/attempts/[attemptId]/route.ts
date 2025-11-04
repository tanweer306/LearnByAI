/**
 * GET /api/quiz/[quizId]/attempts/[attemptId]
 * Get detailed results for a specific quiz attempt
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, attemptId } = await params;

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get quiz attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    // Get all questions with correct answers and explanations
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId);

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 }
      );
    }

    // Parse user answers
    const userAnswers = JSON.parse(attempt.answers as any);

    // Grade each answer
    const gradedAnswers = questions.map((question) => {
      const userAnswer = userAnswers[question.id] || "";
      const correctAnswer = question.correct_answer;
      const marks = question.marks || 1;

      // Check if answer is correct
      let isCorrect = false;
      if (question.question_type === "mcq" || question.question_type === "true_false") {
        isCorrect = userAnswer.trim() === correctAnswer.trim();
      } else {
        isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      }

      return {
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        userAnswer,
        correctAnswer,
        isCorrect,
        marks,
        explanation: question.explanation,
      };
    });

    // Calculate results
    const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
    const totalMarks = gradedAnswers.reduce((sum, a) => sum + a.marks, 0);
    const earnedMarks = gradedAnswers
      .filter((a) => a.isCorrect)
      .reduce((sum, a) => sum + a.marks, 0);

    return NextResponse.json({
      success: true,
      results: {
        score: attempt.score,
        correctCount,
        totalQuestions: attempt.total_questions,
        earnedMarks,
        totalMarks,
        timeTaken: attempt.time_taken,
        passed: attempt.score >= 60,
        completedAt: attempt.completed_at,
      },
      gradedAnswers,
    });
  } catch (error) {
    console.error("Error fetching attempt results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
