import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { translateText } from '@/lib/openai';
import { getCachedTranslation, setCachedTranslation } from '@/lib/translation-cache';
import { getLanguageName } from '@/lib/languages';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, targetLanguage, sourceLanguage = 'en', bookId, pageNumber } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'text and targetLanguage are required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCachedTranslation(text, sourceLanguage, targetLanguage);
    if (cached) {
      return NextResponse.json({
        translation: cached.translation,
        cached: true,
        tokensUsed: cached.tokensUsed || 0,
      });
    }

    // Translate using OpenAI
    const targetLangName = getLanguageName(targetLanguage);
    const translation = await translateText(text, targetLangName);

    // Estimate tokens (rough approximation)
    const tokensUsed = Math.ceil((text.length + translation.length) / 4);

    // Cache the result
    await setCachedTranslation(text, sourceLanguage, targetLanguage, translation, tokensUsed);

    return NextResponse.json({
      translation,
      cached: false,
      tokensUsed,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}