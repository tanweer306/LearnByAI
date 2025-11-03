'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Play, Image as ImageIcon, BookOpen, ChevronDown, MessageSquare } from 'lucide-react';
import type { TextSelection } from '@/components/ai-tutor/PDFViewer';
import BookMetadataPanel from '@/components/ai-tutor/BookMetadataPanel';
import YouTubeSearchModal from '@/components/ai-tutor/YouTubeSearchModal';
import ImagesSearchModal from '@/components/ai-tutor/ImagesSearchModal';
import ConversationHistory from '@/components/ai-tutor/ConversationHistory';
import LanguageSelector from '@/components/ai-tutor/LanguageSelector';
import TranslationModal from '@/components/ai-tutor/TranslationModal';

// Dynamically import components to avoid SSR issues
const PDFViewer = dynamic(
  () => import('@/components/ai-tutor/PDFViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }
);

const ChatWindow = dynamic(
  () => import('@/components/ai-tutor/ChatWindow'),
  { ssr: false }
);

const SelectionToolbar = dynamic(
  () => import('@/components/ai-tutor/SelectionToolbar'),
  { ssr: false }
);

interface Book {
  id: string;
  title: string;
  author?: string;
  subject?: string;
  total_pages?: number;
  file_size?: number;
  created_at?: string;
}

interface BookMetadata {
  id: string;
  title: string;
  author?: string;
  subject?: string;
  total_pages?: number;
  file_size?: number;
  created_at?: string;
  chapters?: Array<{
    title: string;
    startPage: number;
    endPage: number;
  }>;
}

export default function AITutorPage({ params }: { params: Promise<{ bookId: string }> }) {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string>('');
  const [bookMetadata, setBookMetadata] = useState<BookMetadata | null>(null);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [triggerExplain, setTriggerExplain] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [searchContext, setSearchContext] = useState<string>('');
  const [suggestedYoutubeTerm, setSuggestedYoutubeTerm] = useState<string>('');
  const [suggestedImageTerm, setSuggestedImageTerm] = useState<string>('');
  const [youtubeModalQuery, setYoutubeModalQuery] = useState<string>('');
  const [imageModalQuery, setImageModalQuery] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [loadConversationId, setLoadConversationId] = useState<string | undefined>();
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [textToTranslate, setTextToTranslate] = useState<string>('');

  useEffect(() => {
    // Await params and extract bookId
    params.then(({ bookId }) => {
      setBookId(bookId);
    });
  }, [params]);

  useEffect(() => {
    if (bookId) {
      loadBook();
      loadAvailableBooks();
      loadUserLanguage();
    }
  }, [bookId]);

  const loadUserLanguage = async () => {
    try {
      const response = await fetch('/api/user/language');
      if (response.ok) {
        const data = await response.json();
        setCurrentLanguage(data.language || 'en');
      }
    } catch (error) {
      console.error('Error loading user language:', error);
    }
  };

  const loadAvailableBooks = async () => {
    try {
      const response = await fetch('/api/books/list');
      if (response.ok) {
        const data = await response.json();
        setAvailableBooks(data.books.filter((b: Book) => b.total_pages && b.total_pages > 0));
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const handleBookChange = (newBookId: string) => {
    router.push(`/ai-tutor/${newBookId}`);
    setShowBookSelector(false);
  };

  const loadBook = async () => {
    if (!bookId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch book metadata
      const bookResponse = await fetch(`/api/books/${bookId}`);
      if (!bookResponse.ok) {
        throw new Error('Failed to load book');
      }
      const bookData = await bookResponse.json();
      setBook(bookData);
      
      // Set metadata from book data
      setBookMetadata({
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        subject: bookData.subject,
        total_pages: bookData.total_pages,
        file_size: bookData.file_size,
        created_at: bookData.created_at,
      });
      
      // Fetch additional metadata (chapters) if available
      try {
        const metadataResponse = await fetch(`/api/books/${bookId}/metadata`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          if (metadata.chapters) {
            setBookMetadata(prev => prev ? { ...prev, chapters: metadata.chapters } : null);
          }
        }
      } catch (metaError) {
        console.log('No additional metadata available');
      }

      // Get S3 signed URL
      const urlResponse = await fetch(`/api/books/${bookId}/pdf-url`);
      if (!urlResponse.ok) {
        throw new Error('Failed to generate PDF URL');
      }
      const { url } = await urlResponse.json();
      setPdfUrl(url);

      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading book:', error);
      setError(error.message || 'Failed to load book');
      setIsLoading(false);
    }
  };

  const handleTextSelection = (selected: TextSelection) => {
    setSelection(selected);
  };

  const handleExplainSelection = () => {
    if (selection) {
      // Trigger the ChatWindow to send the selected text for explanation
      setTriggerExplain(true);
      // Don't clear selection yet - ChatWindow will handle it
    }
  };

  const handleClearSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleNavigateToPage = (page: number) => {
    console.log("📝 Chat navigation: Going to page", page);
    setCurrentPage(page);
  };

  const handleSuggestedSearchTerms = useCallback(
    (terms: { youtube?: string; images?: string }) => {
      console.log("🎯 Received suggested search terms:", terms);
      if (terms.youtube) {
        console.log("📺 Setting YouTube term:", terms.youtube);
        setSuggestedYoutubeTerm(terms.youtube);
      }
      if (terms.images) {
        console.log("🖼️ Setting Image term:", terms.images);
        setSuggestedImageTerm(terms.images);
      }
    },
    []
  );

  const handleConversationSelect = (conversationId: string) => {
    setLoadConversationId(conversationId);
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    const newId = crypto.randomUUID();
    setCurrentConversationId(newId);
    setLoadConversationId(undefined);
    // This will trigger ChatWindow to clear messages
    window.location.reload();
  };

  const handleLanguageChange = async (languageCode: string) => {
    setCurrentLanguage(languageCode);
    try {
      await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: languageCode }),
      });
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const handleTranslateSelection = () => {
    if (selection?.text) {
      setTextToTranslate(selection.text);
      setShowTranslationModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error || !book || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Book
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'The book could not be loaded. Please try again.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={loadBook}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile only */}
      <div className="lg:hidden p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
          {book.title}
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* PDF Viewer - Responsive width based on history visibility */}
        <div className={`w-full h-1/2 lg:h-full border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all ${
          showHistory ? 'lg:w-1/2' : 'lg:w-3/5'
        }`}>
        {/* Book Metadata Panel */}
        <div className="relative">
          {bookMetadata && (
            <BookMetadataPanel
              metadata={bookMetadata}
              onChapterSelect={(pageNumber) => {
                setCurrentPage(pageNumber);
              }}
            />
          )}

          <div className="hidden lg:flex absolute top-4 right-4 gap-2">
            {/* Book Selector Dropdown */}
            {availableBooks.length > 1 && (
              <div className="relative">
                <Button
                  onClick={() => setShowBookSelector(!showBookSelector)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Switch Book
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {showBookSelector && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Select a Book
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {availableBooks.map((availableBook) => (
                        <button
                          key={availableBook.id}
                          onClick={() => handleBookChange(availableBook.id)}
                          className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            availableBook.id === bookId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                            {availableBook.title}
                          </p>
                          {availableBook.author && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              by {availableBook.author}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Books
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PDFViewer
            pdfUrl={pdfUrl}
            bookId={bookId}
            onTextSelect={handleTextSelection}
            initialPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Chat Window - Responsive width based on history visibility */}
      <div className={`w-full h-1/2 lg:h-full flex flex-col transition-all ${
        showHistory ? 'lg:w-1/3' : 'lg:w-2/5'
      }`}>
        {/* Chat Header with History Button and Language Selector */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">AI Tutor</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {book.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="sm"
              className={`h-8 gap-1 ${
                showHistory ? 'bg-blue-100 dark:bg-blue-900/30' : ''
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">History</span>
            </Button>
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            bookId={bookId}
            bookTitle={book.title}
            selectedText={selection?.text}
            pageNumber={selection?.pageNumber}
            onNavigateToPage={handleNavigateToPage}
            onClearSelection={handleClearSelection}
            triggerExplain={triggerExplain}
            onExplainComplete={() => setTriggerExplain(false)}
            onSuggestedSearchTerms={handleSuggestedSearchTerms}
            conversationId={currentConversationId}
            onConversationIdChange={setCurrentConversationId}
            loadConversationId={loadConversationId}
            preferredLanguage={currentLanguage}
          />
        </div>
        
        {/* Action Buttons: History, YouTube, Images */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={`flex-1 ${
                showHistory ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const context = selection?.text || '';
                setSearchContext(context);
                const fallbackQuery = context || book?.title || '';
                const finalQuery = (suggestedYoutubeTerm || '').trim() || fallbackQuery;
                console.log("📺 YouTube Modal - Suggested:", suggestedYoutubeTerm, "Final:", finalQuery);
                setYoutubeModalQuery(finalQuery);
                setShowYouTubeModal(true);
              }}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2 text-red-600" />
              Find Videos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const context = selection?.text || '';
                setSearchContext(context);
                const fallbackQuery = context || book?.title || '';
                const finalQuery = (suggestedImageTerm || '').trim() || fallbackQuery;
                console.log("🖼️ Images Modal - Suggested:", suggestedImageTerm, "Final:", finalQuery);
                setImageModalQuery(finalQuery);
                setShowImagesModal(true);
              }}
              className="flex-1"
            >
              <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />
              Find Diagrams
            </Button>
          </div>
        </div>
      </div>

      {/* Conversation History Sidebar */}
      <ConversationHistory
        bookId={bookId}
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>

      {/* Selection Toolbar */}
      <SelectionToolbar
        selection={selection}
        onExplain={handleExplainSelection}
        onTranslate={currentLanguage !== 'en' ? handleTranslateSelection : undefined}
        onClear={handleClearSelection}
      />
      
      {/* YouTube Search Modal */}
      <YouTubeSearchModal
        isOpen={showYouTubeModal}
        onClose={() => {
          setShowYouTubeModal(false);
          setSearchContext('');
          setYoutubeModalQuery('');
        }}
        bookId={bookId}
        selectedText={searchContext}
        bookTitle={book?.title || ''}
        initialQuery={youtubeModalQuery}
      />
      
      {/* Images Search Modal */}
      <ImagesSearchModal
        isOpen={showImagesModal}
        onClose={() => {
          setShowImagesModal(false);
          setSearchContext('');
          setImageModalQuery('');
        }}
        bookId={bookId}
        selectedText={searchContext}
        bookTitle={book?.title || ''}
        initialQuery={imageModalQuery}
      />

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => {
          setShowTranslationModal(false);
          setTextToTranslate('');
        }}
        originalText={textToTranslate}
        targetLanguage={currentLanguage}
        pageNumber={selection?.pageNumber}
        bookId={bookId}
      />
    </div>
  );
}
