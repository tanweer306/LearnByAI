import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase, Collections } from '@/lib/mongodb';
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '@/lib/redis';

// GET /api/ai-tutor/conversations?bookId=xxx
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    // Try cache first
    const cacheKey = `conversations:${userId}:${bookId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] Conversations list`);
      return NextResponse.json({ conversations: cached, cached: true });
    }

    // Fetch from MongoDB
    const db = await getDatabase();
    const conversations = await db
      .collection(Collections.AI_CONVERSATIONS)
      .find({ user_id: userId, book_id: bookId })
      .sort({ updated_at: -1 })
      .limit(50)
      .toArray();

    // Transform for frontend
    const formatted = conversations.map((conv: any) => ({
      id: conv.conversation_id,
      bookId: conv.book_id,
      preview: conv.messages?.[0]?.content?.substring(0, 60) || 'New conversation',
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messageCount: conv.messages?.length || 0,
    }));

    // Cache for 5 minutes
    await cacheSet(cacheKey, formatted, CACHE_TTL.MEDIUM);

    return NextResponse.json({ conversations: formatted });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/ai-tutor/conversations
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookId, conversationId, messages } = body;

    if (!bookId || !conversationId) {
      return NextResponse.json(
        { error: 'bookId and conversationId are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(Collections.AI_CONVERSATIONS);

    // Upsert conversation
    await collection.updateOne(
      { conversation_id: conversationId },
      {
        $set: {
          user_id: userId,
          book_id: bookId,
          messages: messages,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
          context_used: [],
        },
      },
      { upsert: true }
    );

    // Invalidate cache
    const cacheKey = `conversations:${userId}:${bookId}`;
    await cacheDelete(cacheKey);
    await cacheDelete(`conversation:${conversationId}`);

    return NextResponse.json({ success: true, conversationId });
  } catch (error: any) {
    console.error('Error saving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}