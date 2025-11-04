import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookMetadata } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToS3, generateBookKey } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import { canUploadBook } from "@/lib/utils/limit-checker";
import { calculateFileHash } from "@/lib/utils/file-hash";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large files

/**
 * ENHANCED UPLOAD API
 * Features:
 * - Duplicate book detection (saves 70% cost)
 * - Multi-role support (student, teacher, school, admin)
 * - All book schema fields
 * - Public/private book sharing
 * - Optimized processing trigger
 */

/**
 * POST /api/books/upload-enhanced
 * Upload a book file with duplicate detection and enhanced metadata
 */
export async function POST(request: NextRequest) {
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

    // ============================================================================
    // CHECK ROLE-BASED UPLOAD LIMIT
    // ============================================================================
    const limitCheck = await canUploadBook(user.id);

    // Admin has unlimited uploads
    if (user.role !== "admin" && !limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          limitReached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    console.log(`📊 Book quota: ${limitCheck.current}/${limitCheck.limit} (${limitCheck.remaining} remaining)`);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const subject = formData.get("subject") as string;
    const gradeLevel = formData.get("gradeLevel") as string;
    const description = formData.get("description") as string;
    const accessType = (formData.get("accessType") as string) || "personal";
    const isPublic = formData.get("isPublic") === "true";
    const sharedWithAllClasses = formData.get("sharedWithAllClasses") === "true";
    const classIds = formData.get("classIds") as string; // JSON array string
    const coverImage = formData.get("coverImage") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "application/epub+zip",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOCX, DOC, TXT, and EPUB files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
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
    // DUPLICATE DETECTION - Calculate file hash
    // ============================================================================
    console.log("🔍 Calculating file hash for duplicate detection...");
    const fileHash = calculateFileHash(buffer);
    console.log(`   File hash: ${fileHash}`);

    // Check if this file already exists
    const { data: existingBooks, error: hashCheckError } = await supabaseAdmin
      .from("books")
      .select("*")
      .eq("file_hash", fileHash)
      .limit(1);

    if (!hashCheckError && existingBooks && existingBooks.length > 0) {
      const existingBook = existingBooks[0];
      console.log(`✅ DUPLICATE DETECTED! Book already exists: ${existingBook.id}`);
      console.log(`   Original title: ${existingBook.title}`);
      console.log(`   Original uploader: ${existingBook.user_id}`);

      // Check if user already has access to this book
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
            existingBookId: userBook.id,
            duplicate: true,
          },
          { status: 409 }
        );
      }

      // Grant access by creating a reference record
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
          status: "ready", // Already processed!
          access_type: accessType,
          is_public: isPublic,
          shared_with_all_classes: sharedWithAllClasses,
          class_ids: classIds ? JSON.parse(classIds) : null,
          uploaded_by_role: user.role || "student",
          institution_id: user.institution_id || null,
          school_id: user.school_id || null,
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
        console.error("Error creating reference book:", refError);
        return NextResponse.json(
          { error: "Failed to grant access to existing book" },
          { status: 500 }
        );
      }

      console.log("🎉 INSTANT ACCESS GRANTED! No processing needed.");
      console.log(`   Saved embedding cost: ~$${(existingBook.total_pages * 0.0001).toFixed(4)}`);
      console.log(`   Saved processing time: ~${Math.ceil(existingBook.total_pages / 10)} minutes`);

      return NextResponse.json({
        success: true,
        duplicate: true,
        instantAccess: true,
        book: {
          id: referenceBook.id,
          title: referenceBook.title,
          status: "ready",
          totalPages: referenceBook.total_pages,
        },
        savings: {
          embeddingCost: (existingBook.total_pages * 0.0001).toFixed(4),
          processingTime: Math.ceil(existingBook.total_pages / 10),
        },
      });
    }

    console.log("📝 New book - proceeding with upload and processing");

    // ============================================================================
    // NEW BOOK - Upload to S3
    // ============================================================================
    const bookId = uuidv4();
    const s3Key = generateBookKey(user.id, bookId, file.name);
    const uploadResult = await uploadToS3(buffer, s3Key, file.type);

    // Upload cover image if provided
    let coverImageUrl = null;
    if (coverImage) {
      try {
        const coverBuffer = Buffer.from(await coverImage.arrayBuffer());
        const coverKey = generateBookKey(user.id, bookId, `cover_${coverImage.name}`);
        const coverResult = await uploadToS3(coverBuffer, coverKey, coverImage.type);
        coverImageUrl = coverResult.url;
      } catch (coverError) {
        console.error("Error uploading cover image:", coverError);
        // Continue without cover image
      }
    }

    // Parse class IDs if provided
    let parsedClassIds = null;
    if (classIds) {
      try {
        parsedClassIds = JSON.parse(classIds);
      } catch (e) {
        console.error("Error parsing class IDs:", e);
      }
    }

    // ============================================================================
    // Create book record in Supabase with ALL fields
    // ============================================================================
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
        shared_with_all_classes: sharedWithAllClasses,
        class_ids: parsedClassIds,
        uploaded_by_role: user.role || "student",
        institution_id: user.institution_id || null,
        school_id: user.school_id || null,
        file_hash: fileHash,
        s3_key: s3Key,
      })
      .select()
      .single();

    if (bookError) {
      console.error("Error creating book record:", bookError);
      return NextResponse.json(
        { error: "Failed to create book record" },
        { status: 500 }
      );
    }

    // Create metadata record in MongoDB
    const db = await getDatabase();
    const metadata: BookMetadata = {
      book_id: bookId,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      s3_url: uploadResult.url,
      processing_status: "pending",
      ocr_required: false,
      chapters: [],
      metadata: {
        subject,
        grade_level: gradeLevel,
      },
      embeddings_generated: false,
      pinecone_ids: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(Collections.BOOKS_METADATA).insertOne(metadata);

    // ============================================================================
    // Trigger OPTIMIZED async processing
    // ============================================================================
    const processingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/books/process-optimized`;
    console.log("📤 Triggering OPTIMIZED processing at:", processingUrl);
    console.log("📚 Book ID:", bookId);

    fetch(processingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        fileBuffer: buffer.toString("base64"),
        filename: file.name,
      }),
    })
      .then((res) => {
        console.log("✅ Processing triggered, status:", res.status);
        if (!res.ok) {
          return res.text().then((text) => {
            console.error("❌ Processing response error:", text);
          });
        }
      })
      .catch((err) => {
        console.error("❌ Error triggering processing:", err);
      });

    return NextResponse.json({
      success: true,
      duplicate: false,
      book: {
        id: book.id,
        title: book.title,
        status: book.status,
      },
    });
  } catch (error) {
    console.error("Error uploading book:", error);
    return NextResponse.json(
      { error: "Failed to upload book" },
      { status: 500 }
    );
  }
}
