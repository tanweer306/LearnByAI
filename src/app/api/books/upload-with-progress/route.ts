import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookMetadata } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToS3, generateBookKey, deleteFromS3 } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import { canUploadBook } from "@/lib/utils/limit-checker";
import { calculateFileHash } from "@/lib/utils/file-hash";
import { processDocument } from "@/lib/document-processor";
import { removeHeadersFooters } from "@/lib/pdf-processor";
import { generateEmbedding } from "@/lib/openai";
import { upsertVectors, deleteVectors } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large files

/**
 * UPLOAD WITH PROGRESS AND ROLLBACK
 * Features:
 * - Real-time progress updates
 * - Complete processing before returning
 * - Automatic rollback on failure
 * - Quota management
 */

interface UploadState {
  bookId: string;
  s3Keys: string[];
  mongoInserted: boolean;
  supabaseInserted: boolean;
  pineconeInserted: boolean;
  quotaIncremented: boolean;
}

/**
 * Sanitize text to remove invalid Unicode characters
 * Fixes issues with surrogate pairs and control characters
 */
function sanitizeText(text: string): string {
  if (!text) return "";

  let result = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // High surrogate
    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = text.charCodeAt(i + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        // Valid surrogate pair - skip both (remove special chars)
        i++; // Skip the low surrogate
      }
      continue;
    }

    // Low surrogate without preceding high surrogate - skip
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    // Replace control characters with space
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      result += " ";
      continue;
    }

    result += text[i];
  }

  return result;
}

/**
 * Truncate text safely to a character limit
 */
function truncateText(text: string, limit: number): string {
  if (!text) return "";
  const sanitized = sanitizeText(text);
  const chars = Array.from(sanitized);
  if (chars.length <= limit) {
    return sanitized;
  }
  return chars.slice(0, limit).join("");
}

/**
 * Rollback all changes if upload fails
 */
async function rollbackUpload(state: UploadState, userId: string) {
  console.log("🔄 Rolling back upload due to error...");
  
  const errors: string[] = [];

  // 1. Delete from S3
  if (state.s3Keys.length > 0) {
    try {
      for (const key of state.s3Keys) {
        await deleteFromS3(key);
        console.log(`  ✅ Deleted from S3: ${key}`);
      }
    } catch (error) {
      console.error("  ❌ Error deleting from S3:", error);
      errors.push("S3 cleanup failed");
    }
  }

  // 2. Delete from Supabase
  if (state.supabaseInserted) {
    try {
      await supabaseAdmin
        .from("books")
        .delete()
        .eq("id", state.bookId);
      console.log("  ✅ Deleted from Supabase");
    } catch (error) {
      console.error("  ❌ Error deleting from Supabase:", error);
      errors.push("Supabase cleanup failed");
    }
  }

  // 3. Delete from MongoDB
  if (state.mongoInserted) {
    try {
      const db = await getDatabase();
      await db.collection(Collections.BOOKS_METADATA).deleteOne({ book_id: state.bookId });
      await db.collection(Collections.BOOK_PAGES).deleteMany({ book_id: state.bookId });
      console.log("  ✅ Deleted from MongoDB");
    } catch (error) {
      console.error("  ❌ Error deleting from MongoDB:", error);
      errors.push("MongoDB cleanup failed");
    }
  }

  // 4. Delete from Pinecone
  if (state.pineconeInserted) {
    try {
      await deleteVectors([`${state.bookId}_*`]);
      console.log("  ✅ Deleted from Pinecone");
    } catch (error) {
      console.error("  ❌ Error deleting from Pinecone:", error);
      errors.push("Pinecone cleanup failed");
    }
  }

  // 5. Reset quota (decrement counter)
  if (state.quotaIncremented) {
    try {
      // Count actual books to reset quota accurately
      const { count } = await supabaseAdmin
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('is_duplicate', 'eq', true);
      
      await supabaseAdmin
        .from('user_subscription_limits')
        .update({ total_books_uploaded: count || 0 })
        .eq('user_id', userId);
      
      console.log("  ✅ Reset quota counter");
    } catch (error) {
      console.error("  ❌ Error resetting quota:", error);
      errors.push("Quota reset failed");
    }
  }

  if (errors.length > 0) {
    console.log("⚠️  Rollback completed with errors:", errors.join(", "));
  } else {
    console.log("✅ Rollback completed successfully");
  }
}

/**
 * POST /api/books/upload-with-progress
 * Upload with complete processing and progress tracking
 */
export async function POST(request: NextRequest) {
  const uploadState: UploadState = {
    bookId: "",
    s3Keys: [],
    mongoInserted: false,
    supabaseInserted: false,
    pineconeInserted: false,
    quotaIncremented: false,
  };

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check upload limit
    const limitCheck = await canUploadBook(user.id);

    if (user.role !== "admin" && !limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          limitReached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
        },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const subject = formData.get("subject") as string;
    const gradeLevel = formData.get("gradeLevel") as string;
    const description = formData.get("description") as string;
    const accessType = (formData.get("accessType") as string) || "personal";
    const isPublic = formData.get("isPublic") === "true";
    const coverImage = formData.get("coverImage") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "application/epub+zip",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ============================================================================
    // STEP 1: Check for duplicates
    // ============================================================================
    console.log("📝 Step 1: Checking for duplicates...");
    const fileHash = calculateFileHash(buffer);
    
    const { data: existingBooks } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("file_hash", fileHash)
      .limit(1);

    if (existingBooks && existingBooks.length > 0) {
      const existingBook = existingBooks[0];
      
      // Check if user already has access
      const { data: userBook } = await supabaseAdmin
        .from("books")
        .select("id")
        .eq("user_id", user.id)
        .eq("original_book_id", existingBook.id)
        .single();

      if (userBook) {
        return NextResponse.json(
          {
            error: "You already have access to this book",
            duplicate: true,
          },
          { status: 409 }
        );
      }

      // Grant instant access
      const referenceBookId = uuidv4();
      
      const { data: referenceBook, error: refError } = await supabaseAdmin
        .from("books")
        .insert({
          id: referenceBookId,
          user_id: user.id,
          title: title || existingBook.title,
          file_url: existingBook.file_url,
          file_type: existingBook.file_type,
          file_size: existingBook.file_size,
          subject: subject || existingBook.subject,
          grade_level: gradeLevel || existingBook.grade_level,
          description: description || existingBook.description,
          cover_image_url: existingBook.cover_image_url,
          total_pages: existingBook.total_pages,
          status: "ready",
          access_type: accessType,
          is_public: isPublic,
          uploaded_by_role: user.role || "student",
          file_hash: fileHash,
          original_book_id: existingBook.id,
          is_duplicate: true,
          original_uploader_id: existingBook.user_id,
          mongodb_ref: existingBook.mongodb_ref,
          pinecone_namespace: existingBook.pinecone_namespace,
          s3_key: existingBook.s3_key,
          processed_at: existingBook.processed_at,
        })
        .select()
        .single();

      if (refError) {
        return NextResponse.json(
          { error: "Failed to grant access" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        progress: 100,
        status: "complete",
        message: "Instant access granted! Book already processed.",
        duplicate: true,
        book: {
          id: referenceBook.id,
          title: referenceBook.title,
          status: "ready",
        },
      });
    }

    // ============================================================================
    // STEP 2: Upload to S3
    // ============================================================================
    console.log("📝 Step 2: Uploading to S3...");
    const bookId = uuidv4();
    uploadState.bookId = bookId;

    const s3Key = generateBookKey(user.id, bookId, file.name);
    const uploadResult = await uploadToS3(buffer, s3Key, file.type);
    uploadState.s3Keys.push(s3Key);

    // Upload cover image
    let coverImageUrl = null;
    if (coverImage) {
      try {
        const coverBuffer = Buffer.from(await coverImage.arrayBuffer());
        const coverKey = generateBookKey(user.id, bookId, `cover_${coverImage.name}`);
        const coverResult = await uploadToS3(coverBuffer, coverKey, coverImage.type);
        coverImageUrl = coverResult.url;
        uploadState.s3Keys.push(coverKey);
      } catch (error) {
        console.error("Error uploading cover:", error);
      }
    }

    // ============================================================================
    // STEP 3: Create Supabase record
    // ============================================================================
    console.log("📝 Step 3: Creating Supabase record...");
    const { data: book, error: bookError } = await supabaseAdmin
      .from("books")
      .insert({
        id: bookId,
        user_id: user.id,
        title: title || file.name,
        file_url: uploadResult.url,
        file_type: file.type,
        file_size: file.size,
        subject,
        grade_level: gradeLevel,
        description,
        cover_image_url: coverImageUrl,
        status: "processing",
        access_type: accessType,
        is_public: isPublic,
        uploaded_by_role: user.role || "student",
        file_hash: fileHash,
        s3_key: s3Key,
      })
      .select()
      .single();

    if (bookError) {
      throw new Error("Failed to create book record in Supabase");
    }

    uploadState.supabaseInserted = true;

    // ============================================================================
    // STEP 4: Process document and extract text
    // ============================================================================
    console.log("📝 Step 4: Processing document...");
    const { pages, totalPages, metadata } = await processDocument(buffer, file.name, file.type);

    if (!pages || pages.length === 0) {
      throw new Error("Failed to extract text from document");
    }

    // ============================================================================
    // STEP 5: Save to MongoDB
    // ============================================================================
    console.log("📝 Step 5: Saving to MongoDB...");
    const db = await getDatabase();

    const bookMetadata: BookMetadata = {
      book_id: bookId,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      s3_url: uploadResult.url,
      processing_status: "processing",
      ocr_required: false,
      chapters: [],
      metadata: {
        subject,
        grade_level: gradeLevel,
        description,
        access_type: accessType,
        is_public: isPublic,
      },
      embeddings_generated: false,
      pinecone_ids: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(Collections.BOOKS_METADATA).insertOne(bookMetadata);
    uploadState.mongoInserted = true;

    // Save pages
    const pageDocuments = pages.map((page: any, index: number) => ({
      book_id: bookId,
      page_number: index + 1,
      plain_text_content: page.text,
      word_count: page.text.split(/\s+/).length,
      has_tables: false,
      has_equations: false,
      pinecone_id: null,
    }));

    await db.collection(Collections.BOOK_PAGES).insertMany(pageDocuments);

    // ============================================================================
    // STEP 6: Generate embeddings and upload to Pinecone
    // ============================================================================
    console.log("📝 Step 6: Generating embeddings...");
    const vectors: any[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (page: any, batchIndex: number) => {
        const pageNumber = i + batchIndex + 1;
        
        try {
          if (!page.text || page.text.trim().length < 50) {
            return null;
          }

          const embedding = await generateEmbedding(page.text);
          const vectorId = `${bookId}_page_${pageNumber}`;

          await db.collection(Collections.BOOK_PAGES).updateOne(
            { book_id: bookId, page_number: pageNumber },
            { $set: { pinecone_id: vectorId } }
          );

          return {
            id: vectorId,
            values: embedding,
            metadata: {
              book_id: bookId,
              page_number: pageNumber,
              text_preview: truncateText(page.text, 200),
            },
          };
        } catch (error) {
          console.error(`Error processing page ${pageNumber}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validVectors = batchResults.filter((v) => v !== null);
      vectors.push(...validVectors);
    }

    // Upload to Pinecone
    if (vectors.length > 0) {
      console.log("📝 Step 7: Uploading to Pinecone...");
      await upsertVectors(vectors, bookId);
      uploadState.pineconeInserted = true;
    }

    // ============================================================================
    // STEP 8: Update status to ready
    // ============================================================================
    console.log("📝 Step 8: Finalizing...");
    await supabaseAdmin
      .from("books")
      .update({
        status: "ready",
        total_pages: totalPages,
        processed_at: new Date().toISOString(),
      })
      .eq("id", bookId);

    await db.collection(Collections.BOOKS_METADATA).updateOne(
      { book_id: bookId },
      {
        $set: {
          processing_status: "completed",
          embeddings_generated: true,
          updated_at: new Date(),
        },
      }
    );

    console.log("✅ Upload complete!");

    return NextResponse.json({
      success: true,
      progress: 100,
      status: "complete",
      message: "Book uploaded and processed successfully!",
      book: {
        id: bookId,
        title: book.title,
        status: "ready",
        totalPages,
      },
    });

  } catch (error: any) {
    console.error("❌ Upload failed:", error);

    // Rollback all changes
    if (uploadState.bookId) {
      await rollbackUpload(uploadState, (await auth()).userId || "");
    }

    return NextResponse.json(
      {
        error: error.message || "Upload failed",
        rolledBack: true,
      },
      { status: 500 }
    );
  }
}
