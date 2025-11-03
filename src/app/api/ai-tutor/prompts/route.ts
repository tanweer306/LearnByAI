import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/ai-tutor/prompts
 * Get AI prompts from Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('type');

    let query = supabaseAdmin
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (promptType) {
      query = query.eq('prompt_type', promptType);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompts: prompts || [] });
  } catch (error) {
    console.error('Error in prompts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
