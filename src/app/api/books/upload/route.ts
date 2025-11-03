import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookMetadata } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadToS3, generateBookKey } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import { canUploadBook } from "@/lib/utils/limit-checker";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large files

/**
 * POST /api/books/upload
 * Upload a book file and start processing
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
    // CHECK LIFETIME BOOK UPLOAD LIMIT
    // ============================================================================
    const limitCheck = await canUploadBook(user.id);
    
    if (!limitCheck.allowed) {
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed." },
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

    // Generate unique book ID
    const bookId = uuidv4();

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const s3Key = generateBookKey(user.id, bookId, file.name);
    const uploadResult = await uploadToS3(buffer, s3Key, file.type);

    // Create book record in Supabase
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
        status: "processing",
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

    // Trigger async processing
    // In production, use a queue system like BullMQ or AWS SQS
    const processingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/books/process`;
    console.log("📤 Triggering processing at:", processingUrl);
    console.log("📚 Book ID:", bookId);
    
    fetch(processingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        bookId, 
        fileBuffer: buffer.toString("base64"),
        filename: file.name 
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
        console.error("   URL:", processingUrl);
        console.error("   This means the processing API is not reachable!");
      });

    return NextResponse.json({
      success: true,
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
