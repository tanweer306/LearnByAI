import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { synthesizeSpeech } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice, format = 'mp3', model } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required for speech synthesis' }, { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text, { voice, format, model });
    const base64Audio = audioBuffer.toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      format,
    });
  } catch (error: any) {
    console.error('Speech synthesis error:', error);

    if (error?.message === 'TTS_MODEL_UNAVAILABLE') {
      return NextResponse.json(
        {
          error: 'tts_model_unavailable',
          message:
            'The configured text-to-speech model is not accessible for this OpenAI project. Please choose a different model or request access.',
        },
        { status: error?.status ?? 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to synthesize speech', details: error?.message },
      { status: 500 }
    );
  }
}
