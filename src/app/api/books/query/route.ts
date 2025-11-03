import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateEmbedding, openai } from '@/lib/openai';
import { queryVectors } from '@/lib/pinecone';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId, question, selectedText, pageNumber } = await req.json();

    if (!bookId || !question) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build enhanced query with context
    let enhancedQuery = question;
    if (selectedText && pageNumber) {
      enhancedQuery = `Context from page ${pageNumber}: "${selectedText}"\n\nQuestion: ${question}`;
    }

    // Generate embedding for the query
    const questionEmbedding = await generateEmbedding(enhancedQuery);

    // Search Pinecone for relevant chunks
    const searchResults = await queryVectors(questionEmbedding, {
      filter: { book_id: bookId },
      topK: 10,
    });

    // Prioritize chunks from nearby pages if pageNumber is provided
    const rankedResults = searchResults.sort((a: any, b: any) => {
      if (pageNumber) {
        const aPageDiff = Math.abs((a.metadata?.page_number || 999) - pageNumber);
        const bPageDiff = Math.abs((b.metadata?.page_number || 999) - pageNumber);

        // Boost score for nearby pages (reduce by 0.01 per page difference)
        const aScore = (a.score || 0) - aPageDiff * 0.01;
        const bScore = (b.score || 0) - bPageDiff * 0.01;

        return bScore - aScore;
      }
      return (b.score || 0) - (a.score || 0);
    });

    // Take top 5 results after ranking
    const topResults = rankedResults.slice(0, 5);

    // Build context from search results
    const context = topResults
      .map(
        (match: any) =>
          `[Page ${match.metadata?.page_number}]\n${match.metadata?.text_preview || ''}`
      )
      .join('\n\n---\n\n');

    // Prepare system message
    const systemMessage = selectedText && pageNumber
      ? `You are a helpful AI tutor. The student has selected text from page ${pageNumber} of their textbook and is asking for an explanation. Provide a clear, educational explanation based on the context from the book. Reference page numbers when relevant.`
      : `You are a helpful AI tutor. Answer the student's question based on the context from their textbook. Provide clear explanations and reference page numbers when relevant.`;

    // Prepare user message
    const userMessage = selectedText
      ? `Context from textbook:\n\n${context}\n\nSelected text from page ${pageNumber}: "${selectedText}"\n\nQuestion: ${question}\n\nProvide a clear explanation based on the context.`
      : `Context from textbook:\n\n${context}\n\nQuestion: ${question}\n\nProvide a clear explanation based on the context.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      answer,
      sources: topResults.map((match: any) => {
        const textPreview = match.metadata?.text_preview;
        const previewText = typeof textPreview === 'string' 
          ? textPreview.substring(0, 200) + '...'
          : '';
        
        return {
          chunkId: match.id,
          page: match.metadata?.page_number,
          score: match.score,
          text: previewText,
        };
      }),
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error: any) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}
