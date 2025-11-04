/**
 * GET /api/quiz/[quizId]
 * Get quiz details and questions
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get quiz details
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select(`
        *,
        books:book_id (
          id,
          title
        ),
        chapters:chapter_id (
          id,
          title,
          chapter_number
        )
      `)
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify user owns the quiz or has access
    if (quiz.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this quiz" },
        { status: 403 }
      );
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("id, question_type, question_text, options, marks")
      .eq("quiz_id", quizId)
      .order("created_at");

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 }
      );
    }

    // Parse options JSON
    const parsedQuestions = questions?.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options as any) : null,
    }));

    // Get previous attempts
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id, score, total_questions, completed_at")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.total_questions,
        timeLimit: quiz.time_limit,
        book: quiz.books,
        chapter: quiz.chapters,
        createdAt: quiz.created_at,
      },
      questions: parsedQuestions || [],
      attempts: attempts || [],
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
