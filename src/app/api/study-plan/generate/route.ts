/**
 * POST /api/study-plan/generate
 * Generate task-based study plan with MongoDB integration
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBookMetadata, getBookPages, getChapterPages } from "@/lib/mongodb";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateStudyPlanRequest {
  bookId: string;
  contentSource: 'entire_book' | 'chapters' | 'pages';
  chapterNumbers?: number[];
  fromPage?: number;
  toPage?: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  dailyGoalMinutes: number;
  studyDays: number[]; // 0-6 (Sunday-Saturday)
  taskTypes: string[]; // ['reading', 'quiz', 'review', 'practice']
  aiOptimize: boolean;
}

interface Task {
  date: string;
  task_type: string;
  title: string;
  description: string;
  estimated_minutes: number;
  content_reference?: string;
}

/**
 * Generate simple task distribution without AI
 */
function generateSimpleTasks(
  availableDates: string[],
  contentPages: any[],
  taskTypes: string[],
  dailyGoalMinutes: number,
  bookMetadata: any
): Task[] {
  const tasks: Task[] = [];
  const pagesPerTask = Math.ceil(contentPages.length / availableDates.length);
  
  let pageIndex = 0;
  
  availableDates.forEach((date, index) => {
    // Add reading task
    if (taskTypes.includes('reading') && pageIndex < contentPages.length) {
      const endPageIndex = Math.min(pageIndex + pagesPerTask, contentPages.length);
      const pages = contentPages.slice(pageIndex, endPageIndex);
      
      tasks.push({
        date,
        task_type: 'reading',
        title: `Read Pages ${pages[0]?.page_number || pageIndex + 1}-${pages[pages.length - 1]?.page_number || endPageIndex}`,
        description: `Complete reading of ${pages.length} pages`,
        estimated_minutes: Math.floor(dailyGoalMinutes * 0.6), // 60% for reading
        content_reference: `pages_${pages[0]?.page_number || pageIndex + 1}-${pages[pages.length - 1]?.page_number || endPageIndex}`,
      });
      
      pageIndex = endPageIndex;
    }
    
    // Add quiz every 3 days
    if (taskTypes.includes('quiz') && index % 3 === 2) {
      tasks.push({
        date,
        task_type: 'quiz',
        title: 'Practice Quiz',
        description: 'Test your understanding of recent material',
        estimated_minutes: Math.floor(dailyGoalMinutes * 0.3), // 30% for quiz
      });
    }
    
    // Add review every 5 days
    if (taskTypes.includes('review') && index % 5 === 4) {
      tasks.push({
        date,
        task_type: 'review',
        title: 'Review Session',
        description: 'Review and consolidate previous material',
        estimated_minutes: Math.floor(dailyGoalMinutes * 0.2), // 20% for review
      });
    }
  });
  
  return tasks;
}

/**
 * Calculate available study dates between start and end date
 * filtered by selected study days
 */
function getAvailableStudyDates(startDate: string, endDate: string, studyDays: number[]): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0-6 (Sunday-Saturday)
    
    if (studyDays.includes(dayOfWeek)) {
      dates.push(current.toISOString().split('T')[0]);
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
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

    // Parse request body
    const body: GenerateStudyPlanRequest = await request.json();
    const {
      bookId,
      contentSource,
      chapterNumbers,
      fromPage,
      toPage,
      title,
      description,
      startDate,
      endDate,
      dailyGoalMinutes,
      studyDays,
      taskTypes,
      aiOptimize,
    } = body;

    // Validate inputs
    if (!bookId || !title || !startDate || !endDate || !dailyGoalMinutes || !studyDays || !taskTypes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (studyDays.length === 0) {
      return NextResponse.json(
        { error: "At least one study day must be selected" },
        { status: 400 }
      );
    }

    if (taskTypes.length === 0) {
      return NextResponse.json(
        { error: "At least one task type must be selected" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
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

    // Verify user owns the book
    if (book.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    console.log(`📚 Fetching content from MongoDB for ${contentSource}...`);

    // Fetch book metadata from MongoDB
    const bookMetadata = await getBookMetadata(bookId);
    if (!bookMetadata) {
      return NextResponse.json(
        { error: "Book metadata not found in MongoDB" },
        { status: 404 }
      );
    }

    // Fetch content based on source
    let contentPages: any[] = [];
    let contentDescription = "";
    let totalWords = 0;

    if (contentSource === 'entire_book') {
      contentPages = await getBookPages(bookId);
      contentDescription = "Entire book";
    } else if (contentSource === 'chapters' && chapterNumbers) {
      contentPages = await getChapterPages(bookId, chapterNumbers);
      const selectedChapters = bookMetadata.chapters?.filter((ch: any) => 
        chapterNumbers.includes(ch.chapter_number)
      ) || [];
      contentDescription = `Chapters: ${selectedChapters.map((ch: any) => ch.chapter_number).join(', ')}`;
    } else if (contentSource === 'pages' && fromPage && toPage) {
      contentPages = await getBookPages(bookId, fromPage, toPage);
      contentDescription = `Pages ${fromPage}-${toPage}`;
    }

    if (contentPages.length === 0) {
      return NextResponse.json(
        { error: "No content found for the selected range" },
        { status: 404 }
      );
    }

    // Calculate total words for reading time estimation
    totalWords = contentPages.reduce((sum, page) => {
      const text = page.plain_text_content || '';
      return sum + text.split(/\s+/).length;
    }, 0);

    const estimatedReadingMinutes = Math.ceil(totalWords / 225); // 225 words per minute

    console.log(`📊 Content: ${contentPages.length} pages, ${totalWords} words, ~${estimatedReadingMinutes} min reading time`);

    // Get chapter list for AI context
    const chapterList = bookMetadata.chapters?.map((ch: any) => 
      `${ch.chapter_number}. ${ch.title} (Pages ${ch.start_page}-${ch.end_page})`
    ).join("\n") || "No chapters defined";

    // ============================================================================
    // CALCULATE STUDY SCHEDULE
    // ============================================================================

    const availableDates = getAvailableStudyDates(startDate, endDate, studyDays);
    const totalStudyDays = availableDates.length;
    const totalAvailableMinutes = totalStudyDays * dailyGoalMinutes;

    console.log(`📅 Schedule: ${totalStudyDays} study days from ${startDate} to ${endDate}`);
    console.log(`⏱️ Available time: ${totalAvailableMinutes} minutes (${Math.floor(totalAvailableMinutes / 60)}h ${totalAvailableMinutes % 60}m)`);

    // Check if enough time
    if (totalAvailableMinutes < estimatedReadingMinutes) {
      return NextResponse.json({
        error: `Not enough time to complete. Need ${estimatedReadingMinutes} min for reading, but only ${totalAvailableMinutes} min available. Consider extending deadline or increasing daily goal.`,
      }, { status: 400 });
    }

    // ============================================================================
    // GENERATE STUDY PLAN USING AI (if enabled)
    // ============================================================================

    let tasks: Task[] = [];

    if (aiOptimize) {
      try {
        console.log("🤖 Generating AI-optimized study plan...");

        const systemPrompt = `You are an expert educational planner. Create a detailed daily study schedule.

Guidelines:
1. Distribute tasks evenly across available days
2. Use spaced repetition for reviews (day after, 3 days after, 7 days after)
3. Place quizzes after logical content blocks (every 2-3 reading tasks)
4. Balance task types throughout the schedule
5. Keep daily workload close to the daily goal
6. Consider cognitive load (don't overload single days)

IMPORTANT: Return ONLY valid JSON. Ensure all strings are properly escaped. Do not include markdown code blocks.

JSON Format:
{
  "tasks": [
    {
      "date": "YYYY-MM-DD",
      "task_type": "reading|quiz|review|practice",
      "title": "Short task title without quotes",
      "description": "Brief description without special characters",
      "estimated_minutes": 60,
      "content_reference": "chapter_1 or pages_10-20"
    }
  ]
}

Rules:
- Keep titles and descriptions simple and short (under 100 chars)
- Avoid quotes, apostrophes, and special characters in text
- Use only alphanumeric characters, spaces, and basic punctuation
- Ensure valid JSON syntax`;

      const userPrompt = `Create a study schedule for:

Book: "${book.title}"
Content: ${contentDescription}
Pages: ${contentPages.length}
Estimated Reading Time: ${estimatedReadingMinutes} minutes

Schedule:
- Start: ${startDate}
- End: ${endDate}
- Available Days: ${availableDates.length} days (${studyDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')})
- Daily Goal: ${dailyGoalMinutes} minutes
- Total Available Time: ${totalAvailableMinutes} minutes

Task Types to Include: ${taskTypes.join(', ')}

Book Structure:
${chapterList}

Generate ${availableDates.length} daily tasks distributed across these dates: ${availableDates.join(', ')}

Ensure:
- Reading tasks cover all ${contentPages.length} pages
- Tasks are spread evenly
- Daily workload ≈ ${dailyGoalMinutes} minutes
- Include ${taskTypes.join(', ')} tasks as requested`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      let aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Clean up response - remove markdown code blocks if present
      aiResponse = aiResponse.trim();
      if (aiResponse.startsWith('```json')) {
        aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (aiResponse.startsWith('```')) {
        aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let aiData;
      try {
        aiData = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error("❌ Failed to parse AI response:", parseError);
        console.error("Response preview:", aiResponse.substring(0, 500));
        throw new Error("AI returned invalid JSON. Falling back to simple distribution.");
      }

      if (!aiData.tasks || !Array.isArray(aiData.tasks)) {
        throw new Error("Invalid task format from AI");
      }

        tasks = aiData.tasks;
        console.log(`✅ AI generated ${tasks.length} tasks`);
      } catch (aiError) {
        console.error("⚠️ AI generation failed, falling back to simple distribution:", aiError);
        tasks = generateSimpleTasks(availableDates, contentPages, taskTypes, dailyGoalMinutes, bookMetadata);
        console.log(`✅ Generated ${tasks.length} tasks (fallback)`);
      }
    } else {
      // Simple distribution without AI
      console.log("📊 Generating simple task distribution...");
      tasks = generateSimpleTasks(availableDates, contentPages, taskTypes, dailyGoalMinutes, bookMetadata);
      console.log(`✅ Generated ${tasks.length} tasks`);
    }

    // ============================================================================
    // SAVE STUDY PLAN TO DATABASE
    // ============================================================================

    console.log(`💾 Saving study plan with ${tasks.length} tasks...`);

    // Insert study plan
    const { data: studyPlan, error: planError } = await supabaseAdmin
      .from("study_plans")
      .insert({
        user_id: user.id,
        book_id: bookId,
        title,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        status: "active",
      })
      .select()
      .single();

    if (planError) {
      console.error("Error creating study plan:", planError);
      return NextResponse.json(
        { error: "Failed to create study plan: " + planError.message },
        { status: 500 }
      );
    }

    // Insert tasks
    const tasksToInsert = tasks.map(task => ({
      study_plan_id: studyPlan.id,
      book_id: bookId,
      chapter_id: null, // We'll handle chapter linking later if needed
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      due_date: task.date,
      estimated_minutes: task.estimated_minutes,
      content_reference: task.content_reference || null,
      completed: false,
    }));

    const { error: tasksError } = await supabaseAdmin
      .from("study_plan_tasks")
      .insert(tasksToInsert);

    if (tasksError) {
      console.error("Error creating tasks:", tasksError);
      // Rollback: delete the study plan
      await supabaseAdmin.from("study_plans").delete().eq("id", studyPlan.id);
      return NextResponse.json(
        { error: "Failed to create tasks: " + tasksError.message },
        { status: 500 }
      );
    }

    // Initialize streak if first plan
    const { error: streakError } = await supabaseAdmin
      .from("study_streaks")
      .upsert(
        {
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          last_study_date: null,
        },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

    if (streakError) {
      console.warn("Warning: Could not initialize streak:", streakError);
    }

    console.log(`✅ Study plan created: ${studyPlan.id} with ${tasks.length} tasks for user ${user.email}`);

    return NextResponse.json({
      success: true,
      studyPlanId: studyPlan.id,
      totalTasks: tasks.length,
      estimatedCompletionDate: endDate,
      message: "Study plan created successfully",
    });
  } catch (error: any) {
    console.error("Error generating study plan:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate study plan",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
