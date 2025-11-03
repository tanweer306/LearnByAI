import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Helper function to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || "learnbyai_platform");
}

// Database types
export interface BookMetadata {
  book_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  s3_url: string;
  processing_status: "pending" | "processing" | "completed" | "failed";
  ocr_required: boolean;
  ocr_status?: string;
  total_pages?: number;
  extracted_text?: string;
  chapters: Array<{
    chapter_number: number;
    title: string;
    start_page: number;
    end_page: number;
    content: string;
    keywords: string[];
    summary?: string;
  }>;
  metadata: {
    author?: string;
    publisher?: string;
    publication_year?: number;
    isbn?: string;
    language?: string;
    subject?: string;
    grade_level?: string;
  };
  embeddings_generated: boolean;
  pinecone_ids: string[];
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
}

export interface ProcessingLog {
  book_id: string;
  stage: "upload" | "extraction" | "ocr" | "embedding" | "completion";
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
  error?: any;
  progress: number;
  started_at: Date;
  completed_at?: Date;
}

export interface UserActivity {
  user_id: string;
  activity_type: string;
  book_id?: string;
  quiz_id?: string;
  details: any;
  duration?: number;
  timestamp: Date;
}

export interface BookPage {
  _id?: string;
  book_id: string;
  page_number: number;
  html_content: string;
  plain_text_content: string;
  image_url?: string; // S3 URL for page image/thumbnail
  has_images: boolean;
  has_tables: boolean;
  has_equations: boolean;
  word_count: number;
  embedding?: number[]; // Vector embedding for semantic search
  pinecone_id?: string;
  created_at: Date;
}

export interface AIConversation {
  conversation_id: string;
  user_id: string;
  book_id?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    tokens_used?: number;
    relevant_pages?: number[]; // Pages used for context
  }>;
  context_used: string[];
  created_at: Date;
  updated_at: Date;
}

// Collection names
export const Collections = {
  BOOKS_METADATA: "books_metadata",
  BOOK_PAGES: "book_pages",
  PROCESSING_LOGS: "processing_logs",
  USER_ACTIVITIES: "user_activities",
  AI_CONVERSATIONS: "ai_conversations",
  SEARCH_CACHE: "search_cache",
} as const;

// ============================================================================
// QUIZ-SPECIFIC MONGODB UTILITIES
// ============================================================================

/**
 * Fetch book metadata from MongoDB
 */
export async function getBookMetadata(bookId: string): Promise<BookMetadata | null> {
  try {
    const db = await getDatabase();
    const metadata = await db
      .collection(Collections.BOOKS_METADATA)
      .findOne({ book_id: bookId });
    
    return metadata as BookMetadata | null;
  } catch (error) {
    console.error('Error fetching book metadata:', error);
    return null;
  }
}

/**
 * Fetch pages for a book with optional page range
 */
export async function getBookPages(
  bookId: string,
  fromPage?: number,
  toPage?: number
): Promise<BookPage[]> {
  try {
    const db = await getDatabase();
    
    const query: any = { book_id: bookId };
    
    if (fromPage !== undefined && toPage !== undefined) {
      query.page_number = { $gte: fromPage, $lte: toPage };
    }
    
    const pages = await db
      .collection(Collections.BOOK_PAGES)
      .find(query)
      .sort({ page_number: 1 })
      .toArray();
    
    return pages as unknown as BookPage[];
  } catch (error) {
    console.error('Error fetching book pages:', error);
    return [];
  }
}

/**
 * Fetch pages for specific chapters
 */
export async function getChapterPages(
  bookId: string,
  chapterNumbers: number[]
): Promise<BookPage[]> {
  try {
    const metadata = await getBookMetadata(bookId);
    if (!metadata || !metadata.chapters || metadata.chapters.length === 0) {
      return [];
    }
    
    // Filter chapters by chapter numbers
    const selectedChapters = metadata.chapters.filter(ch => 
      chapterNumbers.includes(ch.chapter_number)
    );
    
    if (selectedChapters.length === 0) {
      return [];
    }
    
    const db = await getDatabase();
    
    // Build query for all page ranges
    const pageRanges = selectedChapters.map(ch => ({
      page_number: { $gte: ch.start_page, $lte: ch.end_page }
    }));
    
    const pages = await db
      .collection(Collections.BOOK_PAGES)
      .find({
        book_id: bookId,
        $or: pageRanges
      })
      .sort({ page_number: 1 })
      .toArray();
    
    return pages as unknown as BookPage[];
  } catch (error) {
    console.error('Error fetching chapter pages:', error);
    return [];
  }
}

/**
 * Get content from pages as concatenated string
 */
export function concatenatePageContent(pages: BookPage[]): string {
  return pages
    .map(page => page.plain_text_content)
    .filter(content => content && content.trim().length > 0)
    .join('\n\n');
}

/**
 * Validate page range for a book
 */
export async function validatePageRange(
  bookId: string,
  fromPage: number,
  toPage: number
): Promise<{ valid: boolean; error?: string; totalPages?: number }> {
  try {
    const db = await getDatabase();
    const totalPages = await db
      .collection(Collections.BOOK_PAGES)
      .countDocuments({ book_id: bookId });
    
    if (fromPage < 1) {
      return { valid: false, error: 'From page must be at least 1', totalPages };
    }
    
    if (toPage > totalPages) {
      return { valid: false, error: `To page cannot exceed ${totalPages}`, totalPages };
    }
    
    if (fromPage > toPage) {
      return { valid: false, error: 'From page must be less than or equal to to page', totalPages };
    }
    
    return { valid: true, totalPages };
  } catch (error) {
    console.error('Error validating page range:', error);
    return { valid: false, error: 'Failed to validate page range' };
  }
}

/**
 * Get total page count for a book
 */
export async function getBookPageCount(bookId: string): Promise<number> {
  try {
    const db = await getDatabase();
    return await db
      .collection(Collections.BOOK_PAGES)
      .countDocuments({ book_id: bookId });
  } catch (error) {
    console.error('Error getting page count:', error);
    return 0;
  }
}
