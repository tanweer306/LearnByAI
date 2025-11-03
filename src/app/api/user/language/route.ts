import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/user/language - Get user's preferred language
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('preferred_language')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user language:', error);
      return NextResponse.json({ language: 'en' }); // Default to English
    }

    return NextResponse.json({ language: user?.preferred_language || 'en' });
  } catch (error: any) {
    console.error('Error in GET /api/user/language:', error);
    return NextResponse.json({ language: 'en' });
  }
}

// POST /api/user/language - Update user's preferred language
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { language } = await request.json();

    if (!language) {
      return NextResponse.json(
        { error: 'language is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ preferred_language: language })
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error updating user language:', error);
      return NextResponse.json(
        { error: 'Failed to update language' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, language });
  } catch (error: any) {
    console.error('Error in POST /api/user/language:', error);
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    );
  }
}