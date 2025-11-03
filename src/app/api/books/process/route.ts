import { NextRequest, NextResponse } from "next/server";
import { getDatabase, Collections, BookPage, ProcessingLog } from "@/lib/mongodb";
import { supabaseAdmin } from "@/lib/supabase";
import { processDocument } from "@/lib/document-processor";
import { removeHeadersFooters } from "@/lib/pdf-processor";
import { generateEmbedding } from "@/lib/openai";
import { upsertVectors } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

function sanitizeText(text: string): string {
  if (!text) return "";

  let result = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // High surrogate
    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = text.charCodeAt(i + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        result += text[i] + text[i + 1];
        i++; // Skip the low surrogate we just consumed
      }
      // If next char isn't a valid low surrogate, skip this one
      continue;
    }

    // Low surrogate without preceding high surrogate - skip
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    // Replace control characters (except tab, newline, carriage return) with space
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      result += " ";
      continue;
    }

    result += text[i];
  }

  return result;
}

function truncateText(text: string, limit: number): string {
  if (!text) return "";
  const chars = Array.from(text);
  if (chars.length <= limit) {
    return text;
  }
  return chars.slice(0, limit).join("");
}

/**
 * POST /api/books/process
 * Process uploaded book: extract text, generate embeddings, store in vector DB
 */
export async function POST(request: NextRequest) {
  console.log("🚀 Processing API called");
  
  try {
    const { bookId, fileBuffer, filename } = await request.json();
    console.log("📚 Book ID:", bookId);
    console.log("📦 File buffer length:", fileBuffer?.length || 0);

    if (!bookId || !fileBuffer) {
      console.error("❌ Missing bookId or fileBuffer");
      return NextResponse.json(
        { error: "Missing bookId or fileBuffer" },
        { status: 400 }
      );
    }

    console.log("🔌 Connecting to MongoDB...");
    const db = await getDatabase();
    console.log("✅ MongoDB connected");

    // Log processing start
    const log: ProcessingLog = {
      book_id: bookId,
      stage: "extraction",
      status: "started",
      message: "Starting PDF extraction",
      progress: 0,
      started_at: new Date(),
    };
    await db.collection(Collections.PROCESSING_LOGS).insertOne(log);

    // Update book status
    await supabaseAdmin
      .from("books")
      .update({ status: "processing" })
      .eq("id", bookId);

    // Update MongoDB metadata
    await db
      .collection(Collections.BOOKS_METADATA)
      .updateOne(
        { book_id: bookId },
        { $set: { processing_status: "processing", updated_at: new Date() } }
      );

    try {
      // Convert base64 back to buffer
      const buffer = Buffer.from(fileBuffer, "base64");

      // Process document (supports PDF, DOCX, TXT, EPUB)
      console.log(`📄 Processing document: ${filename}`);
      const pdfResult = await processDocument(buffer, filename);
      console.log(`✅ Document processed: ${pdfResult.totalPages} pages extracted`);

      // Update progress
      await db.collection(Collections.PROCESSING_LOGS).insertOne({
        book_id: bookId,
        stage: "extraction",
        status: "completed",
        message: `Extracted ${pdfResult.totalPages} pages`,
        progress: 30,
        started_at: new Date(),
        completed_at: new Date(),
      });

      // Store pages in MongoDB
      const pages = pdfResult.pages.map((page: any) => ({
        book_id: bookId,
        page_number: page.pageNumber,
        html_content: page.htmlContent,
        plain_text_content: page.text,
        has_images: page.hasImages,
        has_tables: page.hasTables,
        has_equations: page.hasEquations,
        word_count: page.wordCount,
        created_at: new Date(),
      }));

      await db.collection(Collections.BOOK_PAGES).insertMany(pages as any);

      // Update progress
      await db.collection(Collections.PROCESSING_LOGS).insertOne({
        book_id: bookId,
        stage: "embedding",
        status: "started",
        message: "Generating embeddings",
        progress: 40,
        started_at: new Date(),
      });

      // Generate embeddings and store in Pinecone
      console.log("🧠 Starting embedding generation...");
      const vectors = [];
      const batchSize = 10;
      
      // Get detected headers and footers for cleaning
      const detectedHeaders = pdfResult.detectedHeaders || [];
      const detectedFooters = pdfResult.detectedFooters || [];

      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        console.log(`📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pages.length / batchSize)}`);
        
        for (const page of batch) {
          try {
            // Remove headers/footers from text before embedding
            const cleanedText = removeHeadersFooters(
              page.plain_text_content,
              detectedHeaders,
              detectedFooters
            );
            
            // Generate embedding for cleaned text
            console.log(`  🔤 Generating embedding for page ${page.page_number}...`);
            const embedding = await generateEmbedding(cleanedText);
            console.log(`  ✅ Embedding generated (${embedding.length} dimensions)`);

            // Create vector ID
            const vectorId = `${bookId}_page_${page.page_number}`;

            const preview = truncateText(sanitizeText(page.plain_text_content), 200);

            vectors.push({
              id: vectorId,
              values: embedding,
              metadata: {
                book_id: bookId,
                page_number: page.page_number,
                word_count: page.word_count,
                has_tables: page.has_tables,
                has_equations: page.has_equations,
                text_preview: preview,
              },
            });

            // Update page with embedding info
            await db.collection(Collections.BOOK_PAGES).updateOne(
              { book_id: bookId, page_number: page.page_number },
              { $set: { pinecone_id: vectorId } }
            );
          } catch (error) {
            console.error(`Error processing page ${page.page_number}:`, error);
          }
        }

        // Upsert batch to Pinecone
        if (vectors.length > 0) {
          console.log(`📤 Uploading ${vectors.length} vectors to Pinecone...`);
          try {
            await upsertVectors(vectors);
            console.log(`✅ Vectors uploaded successfully`);
          } catch (pineconeError) {
            console.error(`❌ Pinecone upload failed:`, pineconeError);
            throw pineconeError;
          }
        }

        // Update progress
        const progress = 40 + Math.floor((i / pages.length) * 50);
        await db.collection(Collections.PROCESSING_LOGS).insertOne({
          book_id: bookId,
          stage: "embedding",
          status: "in_progress",
          message: `Processed ${Math.min(i + batchSize, pages.length)} of ${pages.length} pages`,
          progress,
          started_at: new Date(),
        });
      }

      // Update metadata with detected headers/footers (if available)
      await db
        .collection(Collections.BOOKS_METADATA)
        .updateOne(
          { book_id: bookId },
          {
            $set: {
              metadata: pdfResult.metadata,
              total_pages: pdfResult.totalPages,
              detectedHeaders: pdfResult.detectedHeaders || [],
              detectedFooters: pdfResult.detectedFooters || [],
              updated_at: new Date(),
            },
          }
        );

      // Update Supabase
      await supabaseAdmin
        .from("books")
        .update({
          status: "ready",
          total_pages: pdfResult.totalPages,
        })
        .eq("id", bookId);

      // Log completion
      console.log("🎉 Book processing completed successfully!");
      console.log(`   Total pages: ${pdfResult.totalPages}`);
      console.log(`   Vectors created: ${vectors.length}`);
      
      await db.collection(Collections.PROCESSING_LOGS).insertOne({
        book_id: bookId,
        stage: "completion",
        status: "completed",
        message: "Book processing completed successfully",
        progress: 100,
        started_at: new Date(),
        completed_at: new Date(),
      });

      return NextResponse.json({
        success: true,
        totalPages: pdfResult.totalPages,
        vectorsCreated: vectors.length,
      });
    } catch (processingError) {
      console.error("Error processing book:", processingError);

      // Update status to failed
      await db.collection(Collections.BOOKS_METADATA).updateOne(
        { book_id: bookId },
        { $set: { processing_status: "failed", updated_at: new Date() } }
      );

      await supabaseAdmin
        .from("books")
        .update({ status: "failed" })
        .eq("id", bookId);

      await db.collection(Collections.PROCESSING_LOGS).insertOne({
        book_id: bookId,
        stage: "completion",
        status: "failed",
        message: "Book processing failed",
        error: processingError,
        progress: 0,
        started_at: new Date(),
        completed_at: new Date(),
      });

      throw processingError;
    }
  } catch (error) {
    console.error("Error in book processing:", error);
    return NextResponse.json(
      { error: "Failed to process book" },
      { status: 500 }
    );
  }
}
