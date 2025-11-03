/**
 * POST /api/quiz/generate
 * Generate AI-powered quiz from book content
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { canGenerateQuiz, incrementQuizCount } from "@/lib/utils/limit-checker";
import OpenAI from "openai";
import { getCachedQuiz, setCachedQuiz, CachedQuiz } from "@/lib/cache";
import { logCacheHit, logCacheMiss } from "@/lib/cache-analytics";
import { rateLimitMiddleware, getRateLimitHeaders, createRateLimitError } from "@/lib/rate-limit";
import { 
  getBookPages, 
  getChapterPages, 
  concatenatePageContent, 
  validatePageRange,
  getBookMetadata 
} from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for AI generation

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateQuizRequest {
  bookId: string;
  contentSource: 'entire_book' | 'chapters' | 'pages';
  chapterNumbers?: number[]; // For contentSource = 'chapters'
  fromPage?: number; // For contentSource = 'pages'
  toPage?: number; // For contentSource = 'pages'
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  questionTypes: string[];
  title?: string;
  description?: string;
  timeLimit?: number;
}

export async function POST(request: NextRequest) {
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

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      user.id,
      user.role || "student",
      "quiz-generation",
      "QUIZ_GENERATION"
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createRateLimitError(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ============================================================================
    // CHECK MONTHLY QUIZ GENERATION LIMIT
    // ============================================================================
    const limitCheck = await canGenerateQuiz(user.id);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          limitReached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    console.log(
      `📊 Quiz quota: ${limitCheck.current}/${limitCheck.limit} (${limitCheck.remaining} remaining this month)`
    );

    // Parse request body
    const body: GenerateQuizRequest = await request.json();
    const {
      bookId,
      contentSource,
      chapterNumbers,
      fromPage,
      toPage,
      difficulty,
      questionCount,
      questionTypes,
      title,
      description,
      timeLimit,
    } = body;

    // Validate inputs
    if (!bookId || !contentSource || !difficulty || !questionCount || !questionTypes?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate content source specific fields
    if (contentSource === 'chapters' && (!chapterNumbers || chapterNumbers.length === 0)) {
      return NextResponse.json(
        { error: "Please select at least one chapter" },
        { status: 400 }
      );
    }

    if (contentSource === 'pages') {
      if (fromPage === undefined || toPage === undefined) {
        return NextResponse.json(
          { error: "Please specify page range" },
          { status: 400 }
        );
      }

      const validation = await validatePageRange(bookId, fromPage, toPage);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    if (questionCount < 1 || questionCount > 50) {
      return NextResponse.json(
        { error: "Question count must be between 1 and 50" },
        { status: 400 }
      );
    }

    // Get book details
    const { data: book, error: bookError } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Verify user owns the book or has access
    if (book.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Fetch content from MongoDB based on content source
    let content = "";
    let contentDescription = "";
    let pages;

    switch (contentSource) {
      case 'entire_book':
        console.log('📖 Fetching entire book content from MongoDB...');
        pages = await getBookPages(bookId);
        content = concatenatePageContent(pages);
        contentDescription = `entire book (${pages.length} pages)`;
        break;

      case 'chapters':
        console.log(`📚 Fetching ${chapterNumbers!.length} chapter(s) from MongoDB...`);
        pages = await getChapterPages(bookId, chapterNumbers!);
        content = concatenatePageContent(pages);
        const metadata = await getBookMetadata(bookId);
        const selectedChapters = metadata?.chapters?.filter(ch => 
          chapterNumbers!.includes(ch.chapter_number)
        ) || [];
        contentDescription = selectedChapters.length > 0
          ? selectedChapters.map(ch => ch.title).join(', ')
          : `${chapterNumbers!.length} chapter(s)`;
        break;

      case 'pages':
        console.log(`📄 Fetching pages ${fromPage}-${toPage} from MongoDB...`);
        pages = await getBookPages(bookId, fromPage, toPage);
        content = concatenatePageContent(pages);
        contentDescription = `pages ${fromPage}-${toPage}`;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid content source" },
          { status: 400 }
        );
    }

    if (!content || content.length < 500) {
      return NextResponse.json(
        { 
          error: `Insufficient content to generate quiz. Found ${content.length} characters. Need at least 500 characters.`,
          contentLength: content.length 
        },
        { status: 400 }
      );
    }

    console.log(`✅ Fetched ${content.length} characters from ${contentDescription}`);

    // Truncate content if too long (max 8000 tokens ≈ 32000 chars)
    const maxContentLength = 30000;
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + "...";
    }

    // ============================================================================
    // GENERATE QUIZ USING OPENAI
    // ============================================================================

    const systemPrompt = `You are an expert educational quiz generator. Generate high-quality quiz questions based on the provided content.

Rules:
1. Generate exactly ${questionCount} questions
2. Difficulty level: ${difficulty}
3. Question types: ${questionTypes.join(", ")}
4. Questions must be directly based on the content provided
5. For MCQ questions, provide EXACTLY 4 options with one correct answer
6. For true_false questions, provide a clear statement AND include "options": ["True", "False"]
7. For short answer questions, provide concise expected answers
8. For long answer questions, provide detailed expected answers
9. For fill_blank questions, provide the word/phrase that fills the blank
10. Include brief explanations for correct answers

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation why this is correct"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate as true or false.",
      "options": ["True", "False"],
      "correctAnswer": "True",
      "explanation": "Why this is true/false"
    }
  ]
}

IMPORTANT: 
- MCQ must have "options" array with 4 items
- true_false must have "options": ["True", "False"]
- short_answer, long_answer, fill_blank do NOT need options array`;

    const userPrompt = `Generate ${questionCount} ${difficulty} difficulty quiz questions from this content:

${content}

Question types to include: ${questionTypes.join(", ")}

Remember to return ONLY the JSON object, no additional text.`;

    console.log("🤖 Generating quiz with OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    const quizData = JSON.parse(aiResponse);

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz format from AI");
    }

    console.log(`✅ Generated ${quizData.questions.length} questions`);

    // ============================================================================
    // SAVE QUIZ TO DATABASE
    // ============================================================================

    const quizTitle = title || `${book.title} - ${contentDescription} Quiz`;

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .insert({
        user_id: user.id,
        book_id: bookId,
        chapter_id: null, // Not using Supabase chapters
        title: quizTitle,
        description: description || `AI-generated ${difficulty} difficulty quiz from ${contentDescription}`,
        difficulty,
        total_questions: quizData.questions.length,
        time_limit: timeLimit || null,
      })
      .select()
      .single();

    if (quizError) {
      console.error("Error creating quiz:", quizError);
      return NextResponse.json(
        { error: "Failed to create quiz" },
        { status: 500 }
      );
    }

    // Save questions with validation and fixes
    const questionsToInsert = quizData.questions.map((q: any) => {
      let options = q.options;
      
      // Fix: Ensure true_false questions always have options
      if (q.type === 'true_false' && (!options || options.length === 0)) {
        options = ['True', 'False'];
        console.log(`⚠️ Fixed missing options for true_false question: ${q.question.substring(0, 50)}...`);
      }
      
      // Fix: Ensure MCQ questions have options
      if (q.type === 'mcq' && (!options || options.length < 2)) {
        console.error(`❌ Invalid MCQ question without options: ${q.question}`);
        options = ['Option A', 'Option B', 'Option C', 'Option D']; // Fallback
      }
      
      return {
        quiz_id: quiz.id,
        question_type: q.type,
        question_text: q.question,
        options: options ? JSON.stringify(options) : null,
        correct_answer: q.correctAnswer || q.correct_answer || '',
        explanation: q.explanation || null,
        marks: 1,
      };
    });

    const { error: questionsError } = await supabaseAdmin
      .from("questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error creating questions:", questionsError);
      // Rollback quiz creation
      await supabaseAdmin.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json(
        { error: "Failed to create questions" },
        { status: 500 }
      );
    }

    // ============================================================================
    // INCREMENT MONTHLY QUIZ COUNT
    // ============================================================================
    await incrementQuizCount(user.id);

    console.log(`✅ Quiz created: ${quiz.id} for user ${user.email}`);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.total_questions,
        bookId: quiz.book_id,
        contentSource,
        contentDescription,
      },
      quotaRemaining: limitCheck.remaining - 1,
    });
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate quiz",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
