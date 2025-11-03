"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Sparkles,
  Search,
  X,
} from "lucide-react";

interface BookPage {
  page_number: number;
  html_content: string;
  plain_text_content: string;
  word_count: number;
}

interface BookReaderProps {
  bookId: string;
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  onTextSelect?: (selectedText: string, pageNumber: number) => void;
}

export default function BookReader({
  bookId,
  initialPage = 1,
  onPageChange,
  onTextSelect,
}: BookReaderProps) {
  const [pages, setPages] = useState<BookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [selectedText, setSelectedText] = useState("");
  const [showExplainButton, setShowExplainButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{page: number, matches: number}>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const suppressClearNextClickRef = useRef(false);

  useEffect(() => {
    fetchPages();
  }, [bookId]);

  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage]);

  // Sync when parent updates initialPage (e.g., from clicking a Relevant Page in chat)
  useEffect(() => {
    if (typeof initialPage === "number" && initialPage !== currentPage) {
      setCurrentPage(initialPage);
      // also clear any existing selection and floating button when page jumps
      setSelectedText("");
      setShowExplainButton(false);
    }
  }, [initialPage]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/pages`);
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      
      // Get the position of the selected text
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        // Position button below and centered on the selection
        setButtonPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 10, // 10px below selection
        });
      }
      
      setShowExplainButton(true);
      // Prevent the very next click (that often follows mouseup) from clearing the selection
      suppressClearNextClickRef.current = true;
    } else {
      setShowExplainButton(false);
    }
  };

  const handleExplainClick = (e?: React.MouseEvent) => {
    // Avoid bubbling that could clear selection
    e?.stopPropagation?.();
    if (onTextSelect && selectedText) {
      onTextSelect(selectedText, currentPage);
      setShowExplainButton(false);
    }
  };

  // Clear selection utility
  const clearSelection = () => {
    try {
      const sel = window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } catch {}
    setSelectedText("");
    setShowExplainButton(false);
  };

  // Handle clicks on the page area: after a selection is made, a subsequent click should clear it
  const handlePageClick = () => {
    if (suppressClearNextClickRef.current) {
      // Skip clearing on the first click immediately after selection mouseup
      suppressClearNextClickRef.current = false;
      return;
    }
    if (showExplainButton || selectedText) {
      clearSelection();
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pages.length) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: Array<{page: number, matches: number}> = [];

    pages.forEach((page) => {
      const text = page.plain_text_content.toLowerCase();
      const matches = (text.match(new RegExp(query, 'g')) || []).length;
      
      if (matches > 0) {
        results.push({ page: page.page_number, matches });
      }
    });

    setSearchResults(results);
    
    // Jump to first result
    if (results.length > 0) {
      setCurrentPage(results[0].page);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const currentPageData = pages.find((p) => p.page_number === currentPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#99CE79]" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No pages available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b bg-muted/30">
        {/* Search Bar */}
        {showSearch ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search in book..."
              className="flex-1 h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Found {searchResults.reduce((sum, r) => sum + r.matches, 0)} matches on {searchResults.length} pages:</span>
            <div className="flex gap-1 flex-wrap">
              {searchResults.slice(0, 10).map((result) => (
                <button
                  key={result.page}
                  onClick={() => setCurrentPage(result.page)}
                  className={`px-2 py-1 rounded text-xs ${
                    currentPage === result.page 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  p.{result.page} ({result.matches})
                </button>
              ))}
              {searchResults.length > 10 && (
                <span className="px-2 py-1">+{searchResults.length - 10} more</span>
              )}
            </div>
          </div>
        )}
        
        {/* Navigation and Zoom Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              Page {currentPage} of {pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pages.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              title="Search in book"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div
        className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900"
        onClick={handlePageClick}
        ref={contentWrapperRef}
      >
        <div
          className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.2s",
          }}
        >
          {currentPageData ? (
            <PageContent
              html={currentPageData.html_content}
              onMouseUp={handleTextSelection}
            />
          ) : (
            <p className="text-center text-muted-foreground">Page not found</p>
          )}
        </div>
      </div>

      {/* Explain Button (appears when text is selected) */}
      {showExplainButton && (
        <div
          className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            transform: "translateX(-50%)", // Center horizontally
          }}
        >
          <Button
            onClick={handleExplainClick}
            className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900 shadow-xl hover:shadow-2xl transition-shadow"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Explain This
          </Button>
        </div>
      )}

      {/* Page Navigation Input */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Go to page:</span>
          <input
            type="number"
            min={1}
            max={pages.length}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (!isNaN(page)) {
                goToPage(page);
              }
            }}
            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-[#99CE79]"
          />
        </div>
      </div>
    </div>
  );
}

// Memoized page content to preserve DOM (and text selection) between re-renders
const PageContent = memo(function PageContent({
  html,
  onMouseUp,
}: {
  html: string;
  onMouseUp: () => void;
}) {
  return (
    <div
      className="prose dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
      onMouseUp={onMouseUp}
      style={{
        fontSize: "16px",
        lineHeight: "1.8",
      }}
    />
  );
}, (prev, next) => prev.html === next.html);
