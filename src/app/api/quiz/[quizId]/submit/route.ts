/**
 * POST /api/quiz/[quizId]/submit
 * Submit quiz answers and calculate score
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow time for AI grading

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SubmitQuizRequest {
  answers: Record<string, string>; // questionId -> answer
  timeTaken?: number; // in seconds
}

/**
 * Grade a subjective answer using OpenAI
 */
async function gradeSubjectiveAnswer(
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
  questionType: string
): Promise<{ score: number; feedback: string }> {
  const systemPrompt = `You are an expert educational evaluator. Grade student answers fairly and provide constructive feedback.

Grading Guidelines:
- For short answers and fill-in-the-blank: Accept paraphrasing and minor variations if the core concept is correct
- For long answers: Evaluate comprehension, accuracy, and completeness
- Assign a score from 0.0 to 1.0 (0% to 100%)
- Provide brief, helpful feedback
- Be lenient with spelling/grammar if the meaning is clear
- Award partial credit for partially correct answers`;

  const userPrompt = `Question: ${questionText}

Expected Answer: ${correctAnswer}

Student's Answer: ${userAnswer}

Evaluate if the student's answer is correct. Consider:
1. Does it convey the same meaning as the expected answer?
2. Are the key concepts present?
3. Is it factually accurate?

Return JSON format:
{
  "score": 0.0 to 1.0,
  "feedback": "Brief explanation of the grade"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent grading
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      score: Math.max(0, Math.min(1, result.score || 0)), // Clamp between 0 and 1
      feedback: result.feedback || "Answer evaluated.",
    };
  } catch (error) {
    console.error("AI grading error:", error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizId = params.quizId;
    const body: SubmitQuizRequest = await request.json();
    const { answers, timeTaken } = body;

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "No answers provided" },
        { status: 400 }
      );
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

    // Get quiz details
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify user owns the quiz
    if (quiz.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this quiz" },
        { status: 403 }
      );
    }

    // Get all questions with correct answers
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

    // Grade the quiz
    let correctCount = 0;
    let totalMarks = 0;
    let earnedMarks = 0;

    console.log(`🎯 Grading ${questions.length} questions...`);

    const gradedAnswers = await Promise.all(
      questions.map(async (question) => {
        const userAnswer = answers[question.id] || "";
        const correctAnswer = question.correct_answer;
        const marks = question.marks || 1;

        totalMarks += marks;

        let isCorrect = false;
        let score = 0; // 0 to 1 scale for partial credit
        let feedback = "";

        // Grade based on question type
        if (question.question_type === "mcq" || question.question_type === "true_false") {
          // Exact match for MCQ and True/False
          isCorrect = userAnswer.trim() === correctAnswer.trim();
          score = isCorrect ? 1 : 0;
          feedback = isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${correctAnswer}`;
        } else if (
          question.question_type === "short_answer" ||
          question.question_type === "long_answer" ||
          question.question_type === "fill_blank"
        ) {
          // Use AI to grade subjective answers
          if (!userAnswer.trim()) {
            isCorrect = false;
            score = 0;
            feedback = "No answer provided.";
          } else {
            try {
              const aiGrade = await gradeSubjectiveAnswer(
                question.question_text,
                correctAnswer,
                userAnswer,
                question.question_type
              );
              
              isCorrect = aiGrade.score >= 0.7; // 70% threshold for "correct"
              score = aiGrade.score;
              feedback = aiGrade.feedback;
              
              console.log(`AI graded Q${question.id}: ${(score * 100).toFixed(0)}% - ${feedback.substring(0, 50)}...`);
            } catch (error) {
              console.error(`Failed to AI grade question ${question.id}:`, error);
              // Fallback to simple comparison
              isCorrect = userAnswer.trim().toLowerCase().includes(correctAnswer.trim().toLowerCase());
              score = isCorrect ? 1 : 0;
              feedback = isCorrect 
                ? "Your answer appears correct based on keyword matching."
                : "Your answer may be incorrect. Please review the explanation.";
            }
          }
        } else {
          // Unknown question type - use simple comparison
          isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
          score = isCorrect ? 1 : 0;
        }

        const marksEarned = score * marks;
        earnedMarks += marksEarned;
        
        if (isCorrect) {
          correctCount++;
        }

        return {
          questionId: question.id,
          questionText: question.question_text,
          questionType: question.question_type,
          userAnswer,
          correctAnswer,
          isCorrect,
          score, // 0-1 scale
          marksEarned,
          marksTotal: marks,
          feedback,
          explanation: question.explanation,
        };
      })
    );

    console.log(`✅ Grading complete: ${earnedMarks.toFixed(1)}/${totalMarks} marks`);

    // Calculate percentage score
    const percentageScore = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;

    // Save quiz attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score: percentageScore,
        total_questions: questions.length,
        time_taken: timeTaken || null,
        answers: JSON.stringify(answers),
      })
      .select()
      .single();

    if (attemptError) {
      console.error("Error saving quiz attempt:", attemptError);
      return NextResponse.json(
        { error: "Failed to save quiz attempt" },
        { status: 500 }
      );
    }

    console.log(`✅ Quiz submitted: ${quizId} by ${user.email} - Score: ${percentageScore.toFixed(1)}%`);

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      results: {
        score: percentageScore,
        correctCount,
        totalQuestions: questions.length,
        earnedMarks,
        totalMarks,
        timeTaken,
        passed: percentageScore >= 60, // 60% passing grade
      },
      gradedAnswers,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
