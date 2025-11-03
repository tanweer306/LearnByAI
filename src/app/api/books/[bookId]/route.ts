import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      console.error('User lookup error:', { userId, userError });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User found:', { userId, supabaseId: user.id });

    // Get book metadata first
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check access: user owns book, has access entry, or book is public
    const isOwner = book.user_id === user.id;
    const isPublic = book.is_public === true;

    console.log('Book access check:', {
      bookId,
      bookUserId: book.user_id,
      currentUserId: user.id,
      isOwner,
      isPublic
    });

    if (!isOwner && !isPublic) {
      // Check book_access table
      const { data: access, error: accessError } = await supabaseAdmin
        .from('book_access')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single();

      console.log('Book access table check:', { access, accessError });

      if (!access) {
        return NextResponse.json({ 
          error: 'Access denied',
          details: 'You do not have permission to access this book'
        }, { status: 403 });
      }
    }

    return NextResponse.json(book);

  } catch (error: any) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;
    const updates = await req.json();

    // Get user data to check role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get book to check ownership
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check permissions: owner can edit their books, admin can edit any book
    const isOwner = book.user_id === userData.id;
    const isAdmin = userData.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only admin can change is_public status
    if (updates.is_public !== undefined && !isAdmin) {
      delete updates.is_public;
    }

    // Update book
    const { data: updatedBook, error: updateError } = await supabaseAdmin
      .from('books')
      .update(updates)
      .eq('id', bookId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating book:', updateError);
      return NextResponse.json(
        { error: 'Failed to update book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, book: updatedBook });

  } catch (error: any) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await params;

    // Get user data to check role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get book to check ownership and public status
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = book.user_id === userData.id;
    const isAdmin = userData.role === 'admin';
    const isPublic = book.is_public === true;

    // Only admin can delete public books
    if (isPublic && !isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can delete public books' },
        { status: 403 }
      );
    }

    // Owner can delete their own books (if not public), admin can delete any book
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete book
    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', bookId);

    if (deleteError) {
      console.error('Error deleting book:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete book' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Book deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
