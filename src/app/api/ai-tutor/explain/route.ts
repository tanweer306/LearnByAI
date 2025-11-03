import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateExplanation } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai-tutor/explain
 * Get AI explanation for selected text
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { selectedText, question, bookId, pageNumber, context } = await request.json();

    if (!selectedText || !question) {
      return NextResponse.json(
        { error: "Missing selectedText or question" },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate explanation
    const explanation = await generateExplanation(selectedText, question, context);

    // Save to questions_asked if bookId is provided
    if (bookId) {
      await supabaseAdmin.from("questions_asked").insert({
        user_id: user.id,
        book_id: bookId,
        question: `[Page ${pageNumber}] ${question}`,
        answer: explanation,
        context: selectedText.substring(0, 500),
      });
    }

    return NextResponse.json({
      explanation,
      success: true,
    });
  } catch (error) {
    console.error("Error generating explanation:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
