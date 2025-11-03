import { PDFParse } from "pdf-parse";
import { join } from "path";
import { pathToFileURL } from "url";

let workerConfigured = false;

function ensureWorkerConfigured() {
  if (workerConfigured) {
    return;
  }

  try {
    const workerPath = join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
    const workerUrl = pathToFileURL(workerPath).href;
    PDFParse.setWorker(workerUrl);
    workerConfigured = true;
  } catch (error) {
    console.error("Error configuring PDF worker:", error);
  }
}

export interface ProcessedPage {
  pageNumber: number;
  text: string;
  htmlContent: string;
  hasImages: boolean;
  hasTables: boolean;
  hasEquations: boolean;
  wordCount: number;
}

export interface PDFProcessingResult {
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
 * Process PDF and extract text with structure
 */
export async function processPDF(buffer: Buffer): Promise<PDFProcessingResult> {
  ensureWorkerConfigured();

  const parser = new PDFParse({ data: buffer });

  try {
    const infoResult = await parser.getInfo();
    const textResult = await parser.getText();

    const dateNode = infoResult.getDateNode?.();
    const metadata = {
      title: infoResult.info?.Title,
      author: infoResult.info?.Author,
      subject: infoResult.info?.Subject,
      keywords: infoResult.info?.Keywords,
      creator: infoResult.info?.Creator,
      producer: infoResult.info?.Producer,
      creationDate: dateNode?.CreationDate ?? infoResult.info?.CreationDate,
    };

    // First pass: create pages with original text
    const pages: ProcessedPage[] = textResult.pages.map((page) => {
      const pageText = page.text.trim();
      const htmlContent = convertTextToHTML(pageText);
      const hasImages = false; // Placeholder until image extraction implemented
      const hasTables = detectTables(pageText);
      const hasEquations = detectEquations(pageText);
      const wordCount = pageText ? pageText.split(/\s+/).length : 0;

      return {
        pageNumber: page.num,
        text: pageText,
        htmlContent,
        hasImages,
        hasTables,
        hasEquations,
        wordCount,
      };
    });

    // Detect headers and footers across all pages
    const { headers, footers } = detectHeadersFooters(pages);
    
    console.log(`📋 Detected ${headers.length} headers and ${footers.length} footers`);
    if (headers.length > 0) {
      console.log(`   Headers: ${headers.join(', ')}`);
    }
    if (footers.length > 0) {
      console.log(`   Footers: ${footers.join(', ')}`);
    }

    return {
      totalPages: textResult.total ?? pages.length,
      pages,
      metadata,
      detectedHeaders: headers,
      detectedFooters: footers,
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to process PDF file");
  } finally {
    await parser.destroy();
  }
}

/**
 * Export utility functions for use in processing route
 */
export { removeHeadersFooters, formatTextContent };

/**
 * Detect repeated headers and footers across pages
 */
function detectHeadersFooters(pages: ProcessedPage[]): {
  headers: string[];
  footers: string[];
} {
  if (pages.length < 3) return { headers: [], footers: [] };

  const firstLines: string[] = [];
  const lastLines: string[] = [];

  pages.forEach(page => {
    const lines = page.text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      firstLines.push(lines[0].trim());
      lastLines.push(lines[lines.length - 1].trim());
    }
  });

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();

  firstLines.forEach(line => {
    if (line.length > 3 && line.length < 200) {
      headerCounts.set(line, (headerCounts.get(line) || 0) + 1);
    }
  });

  lastLines.forEach(line => {
    if (line.length > 3 && line.length < 200) {
      footerCounts.set(line, (footerCounts.get(line) || 0) + 1);
    }
  });

  // If appears on >40% of pages, it's likely a header/footer
  const threshold = Math.max(3, pages.length * 0.4);

  const headers = Array.from(headerCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([text, _]) => text);

  const footers = Array.from(footerCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([text, _]) => text);

  return { headers, footers };
}

/**
 * Remove headers and footers from text
 */
function removeHeadersFooters(text: string, headers: string[], footers: string[]): string {
  let cleaned = text;

  headers.forEach(header => {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^${escapedHeader}\\n?`, 'gm'), '');
  });

  footers.forEach(footer => {
    const escapedFooter = footer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`${escapedFooter}\\n?$`, 'gm'), '');
  });

  return cleaned.trim();
}

/**
 * Format text content by removing excessive line breaks and creating proper paragraphs
 */
function formatTextContent(text: string): string {
  if (!text) return "";
  
  // Remove multiple consecutive line breaks (3 or more) and replace with double
  let formatted = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove single line breaks within paragraphs (but keep double for paragraph breaks)
  // This joins lines that were split mid-sentence
  formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1 $2');
  
  // Clean up multiple spaces
  formatted = formatted.replace(/ {2,}/g, ' ');
  
  // Trim whitespace
  formatted = formatted.trim();
  
  return formatted;
}

/**
 * Convert plain text to HTML with enhanced formatting
 */
function convertTextToHTML(text: string): string {
  // First format the text to remove excessive line breaks
  const formattedText = formatTextContent(text);
  
  // Split into lines
  const lines = formattedText.split("\n");
  let html = "";
  let inList = false;
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      if (inTable) {
        html += convertTableToHTML(tableRows);
        tableRows = [];
        inTable = false;
      }
      html += "<br>\n";
      continue;
    }

    // Detect table rows (multiple spaces or tabs)
    const isTableRow = /\s{3,}|\t/.test(line) && line.split(/\s{3,}|\t/).length > 1;
    
    if (isTableRow) {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      html += convertTableToHTML(tableRows);
      tableRows = [];
      inTable = false;
    }

    // Detect headings (lines that are all caps or end with colon)
    if (line === line.toUpperCase() && line.length < 100 && line.length > 3) {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      html += `<h2>${escapeHtml(line)}</h2>\n`;
    }
    // Detect list items
    else if (/^[\d]+\./.test(line) || /^[•\-\*]/.test(line)) {
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      const cleanedLine = line.replace(/^[\d]+\.|^[•\-\*]\s*/, "");
      html += `<li>${formatInlineContent(cleanedLine)}</li>\n`;
    }
    // Regular paragraph
    else {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      html += `<p>${formatInlineContent(line)}</p>\n`;
    }
  }

  if (inList) {
    html += "</ul>\n";
  }
  if (inTable) {
    html += convertTableToHTML(tableRows);
  }

  return html;
}

/**
 * Convert table rows to HTML table
 */
function convertTableToHTML(rows: string[]): string {
  if (rows.length === 0) return "";
  
  let html = '<table class="border-collapse border border-gray-300 my-4 w-full">\n';
  
  rows.forEach((row, index) => {
    const cells = row.split(/\s{3,}|\t/).filter(cell => cell.trim());
    const tag = index === 0 ? "th" : "td";
    const cellClass = index === 0 
      ? 'border border-gray-300 px-4 py-2 bg-gray-100 font-semibold'
      : 'border border-gray-300 px-4 py-2';
    
    html += "  <tr>\n";
    cells.forEach(cell => {
      html += `    <${tag} class="${cellClass}">${escapeHtml(cell.trim())}</${tag}>\n`;
    });
    html += "  </tr>\n";
  });
  
  html += "</table>\n";
  return html;
}

/**
 * Format inline content (bold, italic, equations)
 */
function formatInlineContent(text: string): string {
  let formatted = escapeHtml(text);
  
  // Format mathematical expressions
  formatted = formatted.replace(/\^([\d]+)/g, '<sup>$1</sup>');
  formatted = formatted.replace(/_([\d]+)/g, '<sub>$1</sub>');
  
  // Format scientific notation (e.g., 1.5 × 10^3)
  formatted = formatted.replace(/(\d+\.?\d*)\s*[×x]\s*10\^([\d]+)/gi, '$1 × 10<sup>$2</sup>');
  
  // Highlight mathematical symbols
  formatted = formatted.replace(/([∫∑∏√±×÷≠≤≥∞∂∇∈∉⊂⊃∪∩])/g, '<span class="text-blue-600 font-semibold">$1</span>');
  
  return formatted;
}

/**
 * Detect if text contains tables
 */
function detectTables(text: string): boolean {
  // Simple heuristic: multiple lines with consistent spacing/tabs
  const lines = text.split("\n");
  let tabCount = 0;
  
  for (const line of lines) {
    if (line.includes("\t") || /\s{3,}/.test(line)) {
      tabCount++;
    }
  }
  
  return tabCount > 3;
}

/**
 * Detect if text contains mathematical equations
 */
function detectEquations(text: string): boolean {
  // Look for mathematical symbols and patterns
  const mathPatterns = [
    /[∫∑∏√±×÷≠≤≥∞∂∇∈∉⊂⊃∪∩]/,  // Mathematical symbols
    /\^[\d]+/,  // Superscripts
    /_{[\d]+}/,  // Subscripts
    /\([a-z]\s*[+\-*/]\s*[a-z]\)/i,  // Variables with operators
    /=\s*[\d]+/,  // Equations
    /\d+\.?\d*\s*[×x]\s*10\^\d+/i,  // Scientific notation
    /[a-z]\s*=\s*[a-z]/i,  // Variable assignments
    /\b(sin|cos|tan|log|ln|exp)\s*\(/i,  // Mathematical functions
    /∆|δ|θ|π|σ|μ|λ|Σ|Π/,  // Greek letters
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

/**
 * Extract text from a specific page range
 */
export function extractPageRange(
  pages: ProcessedPage[],
  startPage: number,
  endPage: number
): string {
  return pages
    .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
    .map((p) => p.text)
    .join("\n\n");
}

/**
 * Chunk text for embedding (if page is too long)
 */
export function chunkPageText(text: string, maxChunkSize: number = 1000): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const word of words) {
    if (currentSize + word.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
      currentSize = word.length;
    } else {
      currentChunk.push(word);
      currentSize += word.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
