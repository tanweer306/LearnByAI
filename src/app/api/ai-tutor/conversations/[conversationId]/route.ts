import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase, Collections } from '@/lib/mongodb';
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '@/lib/redis';

// GET /api/ai-tutor/conversations/[conversationId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Try cache first
    const cacheKey = `conversation:${conversationId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] Conversation ${conversationId}`);
      return NextResponse.json({ conversation: cached, cached: true });
    }

    // Fetch from MongoDB
    const db = await getDatabase();
    const conversation = await db
      .collection(Collections.AI_CONVERSATIONS)
      .findOne({ conversation_id: conversationId, user_id: userId });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Cache for 10 minutes
    await cacheSet(cacheKey, conversation, CACHE_TTL.MEDIUM * 2);

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-tutor/conversations/[conversationId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    const db = await getDatabase();
    const result = await db
      .collection(Collections.AI_CONVERSATIONS)
      .deleteOne({ conversation_id: conversationId, user_id: userId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Invalidate caches
    await cacheDelete(`conversation:${conversationId}`);
    // Note: We don't know bookId here, so cache will expire naturally

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}