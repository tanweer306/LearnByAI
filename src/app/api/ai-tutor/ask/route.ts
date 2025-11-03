import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookPage } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding, answerQuestion } from "@/lib/openai";
import { querySimilarVectors } from "@/lib/pinecone";
import { getCachedQA, setCachedQA, CachedQAResponse } from "@/lib/cache";
import { logCacheHit, logCacheMiss } from "@/lib/cache-analytics";
import { rateLimitMiddleware, getRateLimitHeaders, createRateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai-tutor/ask
 * Ask a question about a book
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, bookId, conversationId, preferredLanguage = 'en' } = await request.json();

    if (!question || !bookId) {
      return NextResponse.json(
        { error: "Missing question or bookId" },
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

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      user.id,
      user.role || "student",
      "ai-query",
      "AI_QUERY"
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

    // 🔥 CHECK CACHE FIRST - This is where we save money!
    const cachedResponse = await getCachedQA(bookId, question, preferredLanguage);
    
    if (cachedResponse) {
      await logCacheHit("ai-query", cachedResponse.tokensUsed, cachedResponse.model);
      
      return NextResponse.json(
        {
          originalAnswer: cachedResponse.originalAnswer,
          translatedAnswer: cachedResponse.translatedAnswer,
          relevantPages: cachedResponse.sources.map(s => ({
            pageNumber: s.pageNumber,
            textPreview: s.text.substring(0, 200) + "...",
            score: s.score,
          })),
          tokensUsed: cachedResponse.tokensUsed,
          cached: true,
          cachedAt: cachedResponse.cachedAt,
          youtubeSearchTerm: cachedResponse.youtubeSearchTerm,
          imageSearchTerm: cachedResponse.imageSearchTerm,
          language: preferredLanguage,
        },
        {
          headers: {
            "X-Cache": "HIT",
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Cache miss - continue with normal flow
    await logCacheMiss("ai-query");

    // Verify book belongs to user
    const { data: book } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (!book) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    if (book.status !== "ready") {
      return NextResponse.json(
        { error: "Book is still processing" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Query Pinecone for similar pages
    const similarVectors = await querySimilarVectors(questionEmbedding, 5, {
      book_id: bookId,
    });

    if (similarVectors.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant information in this book to answer your question. Could you try rephrasing or asking about a different topic?",
        relevantPages: [],
        tokensUsed: 0,
      });
    }

    // Get page details from MongoDB
    const pageNumbers = similarVectors.map(
      (v) => v.metadata?.page_number as number
    );

    const pages = await db
      .collection<BookPage>(Collections.BOOK_PAGES)
      .find({
        book_id: bookId,
        page_number: { $in: pageNumbers },
      })
      .toArray();

    // Prepare context for AI
    const contexts = pages.map((page) => ({
      page_number: page.page_number,
      content: page.plain_text_content,
    }));

    // Get conversation history if provided
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    
    if (conversationId) {
      const conversation = await db
        .collection(Collections.AI_CONVERSATIONS)
        .findOne({ conversation_id: conversationId });

      if (conversation) {
        conversationHistory = conversation.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    }

    // Generate answer
    const { originalAnswer, translatedAnswer, tokensUsed, youtubeSearchTerm, imageSearchTerm } = await answerQuestion(
      question,
      contexts,
      conversationHistory,
      preferredLanguage
    );

    // Save to conversation history
    const newConversationId = conversationId || `conv_${Date.now()}_${user.id}`;
    
    await db.collection(Collections.AI_CONVERSATIONS).updateOne(
      { conversation_id: newConversationId },
      {
        $set: {
          user_id: user.id,
          book_id: bookId,
          updated_at: new Date(),
        },
        $push: {
          messages: {
            $each: [
              {
                role: "user",
                content: question,
                timestamp: new Date(),
                relevant_pages: pageNumbers,
              },
              {
                role: "assistant",
                content: translatedAnswer,
                timestamp: new Date(),
                tokens_used: tokensUsed,
                metadata: {
                  originalAnswer,
                  language: preferredLanguage,
                },
              },
            ],
          } as any,
        },
        $setOnInsert: {
          conversation_id: newConversationId,
          context_used: [],
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    // Save to questions_asked in Supabase
    await supabaseAdmin.from("questions_asked").insert({
      user_id: user.id,
      book_id: bookId,
      question,
      answer: translatedAnswer,
      context: contexts.map((c) => `Page ${c.page_number}`).join(", "),
    });

    // 🔥 CACHE THE RESPONSE - Save for future identical questions
    const cacheData: CachedQAResponse = {
      originalAnswer,
      translatedAnswer,
      sources: pages.map((p) => ({
        chunkId: p._id?.toString() || "",
        score: similarVectors.find((v) => v.metadata?.page_number === p.page_number)?.score || 0,
        text: p.plain_text_content,
        pageNumber: p.page_number,
      })),
      tokensUsed,
      cachedAt: new Date().toISOString(),
      model: "gpt-4o-mini",
      youtubeSearchTerm,
      imageSearchTerm,
    };

    await setCachedQA(bookId, question, cacheData, preferredLanguage);

    return NextResponse.json(
      {
        originalAnswer,
        translatedAnswer,
        relevantPages: pages.map((p) => ({
          pageNumber: p.page_number,
          htmlContent: p.html_content,
          textPreview: p.plain_text_content.substring(0, 200) + "...",
          score: similarVectors.find((v) => v.metadata?.page_number === p.page_number)?.score || 0,
        })),
        language: preferredLanguage,
        conversationId: newConversationId,
        tokensUsed,
        cached: false,
        youtubeSearchTerm,
        imageSearchTerm,
      },
      {
        headers: {
          "X-Cache": "MISS",
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    console.error("Error processing question:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
