import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '@/lib/supabase';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    // Get user's Supabase ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      console.error('User lookup error for pdf-url:', { userId, userError });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('PDF URL request user:', { clerkId: userId, supabaseId: user.id });

    // Get book S3 key and metadata
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('s3_key, file_url, user_id, is_public')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check access: user owns book, has access entry, or book is public
    const isOwner = book.user_id === user.id;
    const isPublic = book.is_public === true;

    console.log('PDF URL access check:', { bookId, bookOwner: book.user_id, requester: user.id, isOwner, isPublic });

    if (!isOwner && !isPublic) {
      // Check book_access table
      const { data: access, error: accessError } = await supabaseAdmin
        .from('book_access')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single();

      console.log('PDF URL access table check:', { access, accessError });

      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Generate signed URL (1 hour expiration) with response overrides to ensure proper PDF headers
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: book.s3_key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: 'inline',
      ResponseCacheControl: 'private, max-age=3600',
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ 
      url,
      expiresIn: 3600,
      bookId: bookId
    });

  } catch (error: any) {
    console.error('Error generating PDF URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF URL' },
      { status: 500 }
    );
  }
}
