'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, Bookmark } from 'lucide-react';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

// Set PDF.js worker only on client side
if (typeof window !== 'undefined') {
  import('react-pdf').then((mod) => {
    const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    mod.pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  });
}

export interface TextSelection {
  text: string;
  pageNumber: number;
  boundingRect: DOMRect;
  startOffset: number;
  endOffset: number;
}

interface SearchResult {
  page: number;
  text: string;
  score: number;
}

interface SelectionOverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PDFViewerProps {
  pdfUrl: string;
  onTextSelect: (selection: TextSelection) => void;
  initialPage?: number;
  bookId: string;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({ 
  pdfUrl, 
  onTextSelect, 
  initialPage = 1, 
  bookId,
  onPageChange 
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [selectionRects, setSelectionRects] = useState<SelectionOverlayRect[]>([]);

  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(pageNumber);
    }
  }, [pageNumber, onPageChange]);

  // Respond to external page changes
  useEffect(() => {
    if (initialPage !== pageNumber && initialPage >= 1 && initialPage <= numPages) {
      console.log("📄 PDF: External page change to", initialPage);
      setPageNumber(initialPage);
    }
  }, [initialPage]); // Remove pageNumber from dependencies to prevent loop

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionRects([]);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try again.');
    setIsLoading(false);
  };

  useEffect(() => {
    if (pdfUrl) {
      // Reset loading state whenever the PDF source changes
      setIsLoading(true);
      setError(null);
      // Light debug: log current URL used by react-pdf
      console.log('PDF URL:', pdfUrl);
    }
  }, [pdfUrl]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selection || !selectedText || selection.isCollapsed) {
      setSelectionRects([]);
      return;
    }

    const anchorParent = selection.anchorNode instanceof HTMLElement
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
    const focusParent = selection.focusNode instanceof HTMLElement
      ? selection.focusNode
      : selection.focusNode?.parentElement;

    const isWithinPdf = anchorParent?.closest('.react-pdf__Page__textContent') &&
      focusParent?.closest('.react-pdf__Page__textContent');

    if (!isWithinPdf) {
      setSelectionRects([]);
      return;
    }

    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);

    if (!viewerRef.current || clientRects.length === 0) {
      setSelectionRects([]);
      return;
    }

    const viewerRect = viewerRef.current.getBoundingClientRect();
    const scrollTop = viewerRef.current.scrollTop;
    const scrollLeft = viewerRef.current.scrollLeft;

    const overlayRects = clientRects.map((rect) => ({
      top: rect.top - viewerRect.top + scrollTop,
      left: rect.left - viewerRect.left + scrollLeft,
      width: rect.width,
      height: rect.height,
    }));

    setSelectionRects(overlayRects);

    const minLeft = Math.min(...clientRects.map((rect) => rect.left));
    const minTop = Math.min(...clientRects.map((rect) => rect.top));
    const maxRight = Math.max(...clientRects.map((rect) => rect.right));
    const maxBottom = Math.max(...clientRects.map((rect) => rect.bottom));

    const boundingRect = new DOMRect(minLeft, minTop, maxRight - minLeft, maxBottom - minTop);

    onTextSelect({
      text: selectedText,
      pageNumber,
      boundingRect,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    });
  }, [pageNumber, onTextSelect]);

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(2.5, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPreviousPage();
    } else if (e.key === 'ArrowRight') {
      goToNextPage();
    } else if (e.key === '+' || e.key === '=') {
      zoomIn();
    } else if (e.key === '-') {
      zoomOut();
    }
  }, [pageNumber, numPages]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/books/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          question: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.sources && data.sources.length > 0) {
        setSearchResults(data.sources);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (page: number) => {
    setPageNumber(page);
    setShowResults(false);
    setSearchQuery('');
    setShowSearch(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= numPages) {
                  setPageNumber(page);
                }
              }}
              className="w-12 text-center bg-transparent border-none outline-none text-sm font-medium"
              min={1}
              max={numPages}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              / {numPages}
            </span>
          </div>

          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 relative">
          {showSearch && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search in book..."
                className="px-3 py-1 text-sm border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />
              <Button 
                onClick={handleSearch} 
                size="sm" 
                variant="default" 
                className="h-8"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Found {searchResults.length} relevant page{searchResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleResultClick(result.page)}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Page {result.page}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.round((result.score || 0) * 100)}% match
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {result.text}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowResults(false)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Close results
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <Button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) {
                setShowResults(false);
                setSearchQuery('');
              }
            }}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          <Button onClick={zoomOut} variant="outline" size="sm" className="h-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button onClick={zoomIn} variant="outline" size="sm" className="h-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Display */}
      <style jsx global>{`
        .react-pdf__Page__textContent ::selection {
          background-color: rgba(124, 58, 237, 0.45) !important;
          color: inherit !important;
        }
        .react-pdf__Page__textContent ::-moz-selection {
          background-color: rgba(124, 58, 237, 0.45) !important;
          color: inherit !important;
        }
      `}</style>
      <div
        ref={viewerRef}
        className="flex-1 overflow-auto p-4 flex justify-center relative"
        onMouseUp={handleTextSelection}
      >
        {error ? (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Error Loading PDF
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : pdfUrl ? (
          <>
            <Document
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              onSourceError={handleDocumentLoadError as any}
              loading={<div>Loading PDF...</div>}
              error={<div>Error loading PDF</div>}
              className="pdf-document"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </Document>

            {selectionRects.map((rect, index) => (
              <div
                key={index}
                className="pointer-events-none absolute rounded-md border border-purple-400/70 bg-purple-500/25 shadow-[0_0_0_1px_rgba(124,58,237,0.35)]"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  zIndex: 20,
                }}
              />
            ))}

            <div className="absolute right-4 bottom-20 text-xs text-gray-500 dark:text-gray-400">
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline">
                Open PDF
              </a>
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
                <div className="text-center">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Loading PDF...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Preparing PDF...
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          <span className="font-medium">Shortcuts:</span> ← → (Navigate) | + - (Zoom) | Select text to explain with AI
        </p>
      </div>
    </div>
  );
}
