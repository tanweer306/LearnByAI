import mammoth from "mammoth";
import EPub from "epub2";
import { promisify } from "util";
import { processPDF, ProcessedPage } from "./pdf-processor";

export interface DocumentProcessingResult {
  totalPages: number;
  pages: ProcessedPage[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
  };
  detectedHeaders?: string[];
  detectedFooters?: string[];
}

/**
 * Process document based on file type
 */
export async function processDocument(
  buffer: Buffer,
  filename: string
): Promise<DocumentProcessingResult> {
  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    case "pdf":
      return await processPDF(buffer);
    case "docx":
      return await processDocx(buffer);
    case "doc":
      return await processDoc(buffer);
    case "txt":
      return await processTxt(buffer);
    case "epub":
      return await processEpub(buffer);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

/**
 * Process .docx files using mammoth
 */
async function processDocx(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    
    // Extract plain text from HTML
    const plainText = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Split into pages (roughly 500 words per page)
    const words = plainText.split(/\s+/);
    const wordsPerPage = 500;
    const pages: ProcessedPage[] = [];

    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      const pageText = pageWords.join(" ");
      const pageNumber = Math.floor(i / wordsPerPage) + 1;

      pages.push({
        pageNumber,
        text: pageText,
        htmlContent: `<div class="prose">${pageText}</div>`,
        hasImages: false,
        hasTables: /table|<td|<th/.test(html),
        hasEquations: detectEquations(pageText),
        wordCount: pageWords.length,
      });
    }

    return {
      totalPages: pages.length,
      pages,
      metadata: {
        title: extractTitleFromText(plainText),
      },
    };
  } catch (error) {
    console.error("Error processing DOCX:", error);
    throw new Error("Failed to process DOCX file");
  }
}

/**
 * Process .doc files (legacy Word format)
 * Note: Full .doc support requires additional libraries
 * This is a basic implementation
 */
async function processDoc(buffer: Buffer): Promise<DocumentProcessingResult> {
  // For now, try to process as text
  // In production, you might want to use a library like 'word-extractor'
  console.warn(".doc format has limited support. Consider converting to .docx");
  return await processTxt(buffer);
}

/**
 * Process .txt files
 */
async function processTxt(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    const text = buffer.toString("utf-8");
    
    // Split into pages (roughly 500 words per page)
    const words = text.split(/\s+/);
    const wordsPerPage = 500;
    const pages: ProcessedPage[] = [];

    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      const pageText = pageWords.join(" ");
      const pageNumber = Math.floor(i / wordsPerPage) + 1;

      pages.push({
        pageNumber,
        text: pageText,
        htmlContent: formatTextToHTML(pageText),
        hasImages: false,
        hasTables: false,
        hasEquations: detectEquations(pageText),
        wordCount: pageWords.length,
      });
    }

    return {
      totalPages: pages.length,
      pages,
      metadata: {
        title: extractTitleFromText(text),
      },
    };
  } catch (error) {
    console.error("Error processing TXT:", error);
    throw new Error("Failed to process TXT file");
  }
}

/**
 * Process .epub files
 */
async function processEpub(buffer: Buffer): Promise<DocumentProcessingResult> {
  return new Promise((resolve, reject) => {
    try {
      // EPub expects a file path or buffer as string, so we need to handle it differently
      const epub = new EPub(buffer as any);
      
      epub.on("error", (error: Error) => {
        console.error("Error processing EPUB:", error);
        reject(new Error("Failed to process EPUB file"));
      });

      epub.on("end", async () => {
        try {
          const metadata = epub.metadata;
          const pages: ProcessedPage[] = [];
          let pageNumber = 1;

          // Get all chapters
          const flow = epub.flow;
          
          for (const chapter of flow) {
            const getChapterAsync = promisify(epub.getChapter.bind(epub));
            const chapterText = await getChapterAsync(chapter.id as string);
            
            if (!chapterText) continue;
            
            // Remove HTML tags
            const plainText = chapterText
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            // Split chapter into pages if too long
            const words = plainText.split(/\s+/);
            const wordsPerPage = 500;

            for (let i = 0; i < words.length; i += wordsPerPage) {
              const pageWords = words.slice(i, i + wordsPerPage);
              const pageText = pageWords.join(" ");

              pages.push({
                pageNumber: pageNumber++,
                text: pageText,
                htmlContent: formatTextToHTML(pageText),
                hasImages: false,
                hasTables: false,
                hasEquations: detectEquations(pageText),
                wordCount: pageWords.length,
              });
            }
          }

          const title = Array.isArray(metadata.title) 
            ? metadata.title.join(", ") 
            : metadata.title;
          const author = Array.isArray(metadata.creator) 
            ? metadata.creator.join(", ") 
            : metadata.creator;
          
          resolve({
            totalPages: pages.length,
            pages,
            metadata: {
              title: title as string | undefined,
              author: author as string | undefined,
              subject: metadata.subject as string | undefined,
            },
          });
        } catch (error) {
          console.error("Error extracting EPUB chapters:", error);
          reject(new Error("Failed to extract EPUB content"));
        }
      });

      epub.parse();
    } catch (error) {
      console.error("Error initializing EPUB parser:", error);
      reject(new Error("Failed to initialize EPUB parser"));
    }
  });
}

/**
 * Format plain text to HTML with paragraphs
 */
function formatTextToHTML(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("\n");
}

/**
 * Extract title from first lines of text
 */
function extractTitleFromText(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Return first line if it's not too long (likely a title)
    if (firstLine.length < 100) {
      return firstLine;
    }
  }
  return "Untitled Document";
}

/**
 * Detect mathematical equations in text
 */
function detectEquations(text: string): boolean {
  const mathPatterns = [
    /[∫∑∏√±×÷≠≤≥∞∂∇∈∉⊂⊃∪∩]/,
    /\^[\d]+/,
    /_{[\d]+}/,
    /\([a-z]\s*[+\-*/]\s*[a-z]\)/i,
    /=\s*[\d]+/,
    /\d+\.?\d*\s*[×x]\s*10\^\d+/i,
    /[a-z]\s*=\s*[a-z]/i,
    /\b(sin|cos|tan|log|ln|exp)\s*\(/i,
    /∆|δ|θ|π|σ|μ|λ|Σ|Π/,
  ];

  return mathPatterns.some((pattern) => pattern.test(text));
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
