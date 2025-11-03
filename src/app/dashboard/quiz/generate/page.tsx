/**
 * Quiz Generation Page
 * AI-powered quiz generation from book content
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Sparkles,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Book {
  id: string;
  title: string;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  start_page: number;
  end_page: number;
}

type ContentSource = 'entire_book' | 'chapters' | 'pages';

export default function GenerateQuizPage() {
  const { user } = useUser();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [hasChapters, setHasChapters] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedBook, setSelectedBook] = useState("");
  const [contentSource, setContentSource] = useState<ContentSource>('entire_book');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(1);
  const [quizTitle, setQuizTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq"]);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const selectedBookTitle = useMemo(
    () => books.find((book) => book.id === selectedBook)?.title ?? "",
    [books, selectedBook]
  );

  const selectedChaptersLabel = useMemo(() => {
    if (selectedChapters.length === 0) {
      return "";
    }

    if (selectedChapters.length === chapters.length) {
      return "All chapters selected";
    }

    return `${selectedChapters.length} chapter(s) selected`;
  }, [selectedChapters, chapters]);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetchBooks();
    fetchQuota();
  }, []);

  useEffect(() => {
    if (selectedBook) {
      fetchChapters(selectedBook);
    } else {
      setChapters([]);
      setSelectedChapters([]);
      setHasChapters(false);
      setTotalPages(0);
      setContentSource('entire_book');
    }
  }, [selectedBook]);

  const fetchBooks = async () => {
    try {
      setLoadingBooks(true);
      const response = await fetch("/api/books/list");
      const data = await response.json();
      setBooks(data.books || []);
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchChapters = async (bookId: string) => {
    try {
      setLoadingChapters(true);
      const response = await fetch(`/api/books/${bookId}/chapters`);
      const data = await response.json();
      setChapters(data.chapters || []);
      setHasChapters(data.hasChapters || false);
      setTotalPages(data.totalPages || 0);
      setToPage(data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching chapters:", err);
    } finally {
      setLoadingChapters(false);
    }
  };

  const fetchQuota = async () => {
    try {
      const response = await fetch("/api/quiz/quota");
      const data = await response.json();
      setQuotaRemaining(data.remaining);
    } catch (err) {
      console.error("Error fetching quota:", err);
    }
  };

  const handleQuestionTypeToggle = (type: string) => {
    if (questionTypes.includes(type)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((t) => t !== type));
      }
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const handleChapterToggle = (chapterNumber: number) => {
    setSelectedChapters(prev => 
      prev.includes(chapterNumber)
        ? prev.filter(n => n !== chapterNumber)
        : [...prev, chapterNumber]
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!selectedBook) {
      setError("Please select a book");
      return;
    }

    if (contentSource === 'chapters' && selectedChapters.length === 0) {
      setError("Please select at least one chapter");
      return;
    }

    if (contentSource === 'pages') {
      if (fromPage < 1 || toPage > totalPages || fromPage > toPage) {
        setError(`Please enter a valid page range (1-${totalPages})`);
        return;
      }
    }

    if (questionCount < 1 || questionCount > 50) {
      setError("Question count must be between 1 and 50");
      return;
    }

    if (questionTypes.length === 0) {
      setError("Please select at least one question type");
      return;
    }

    setGenerating(true);

    try {
      const requestBody: any = {
        bookId: selectedBook,
        contentSource,
        difficulty,
        questionCount,
        questionTypes,
        title: quizTitle || undefined,
        description: description || undefined,
        timeLimit: timeLimit || undefined,
      };

      if (contentSource === 'chapters') {
        requestBody.chapterNumbers = selectedChapters;
      } else if (contentSource === 'pages') {
        requestBody.fromPage = fromPage;
        requestBody.toPage = toPage;
      }

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.status === 403 && data.limitReached) {
        setError(
          `${data.error}\n\nYou've used ${data.current} of ${data.limit} quizzes this month. Upgrade to generate more!`
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setSuccess(true);
      setQuotaRemaining(data.quotaRemaining);

      // Redirect to quiz page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/quiz/${data.quiz.id}`);
      }, 2000);
    } catch (err: any) {
      console.error("Error generating quiz:", err);
      setError(err.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/quiz">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
              Generate AI Quiz
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Create custom quizzes from your study materials using AI
          </p>
        </div>

        {/* Quota Display */}
        {quotaRemaining !== null && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You have <strong>{quotaRemaining}</strong> quiz generations remaining this month
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Quiz generated successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#99CE79]" />
                  Quiz Configuration
                </CardTitle>
                <CardDescription>
                  Configure your AI-generated quiz settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Book Selection */}
                <div className="space-y-2">
                  <Label>Select Book *</Label>
                  {loadingBooks ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading books...
                    </div>
                  ) : books.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No books uploaded yet.{" "}
                      <Link
                        href="/dashboard/books/upload"
                        className="text-[#99CE79] hover:underline"
                      >
                        Upload a book
                      </Link>
                    </div>
                  ) : (
                    <Select value={selectedBook} onValueChange={setSelectedBook}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a book...">
                          {selectedBookTitle}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Content Source Selection */}
                {selectedBook && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Content Source *</Label>
                      {loadingChapters ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading book information...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="entire_book"
                              name="contentSource"
                              value="entire_book"
                              checked={contentSource === 'entire_book'}
                              onChange={(e) => setContentSource(e.target.value as ContentSource)}
                              className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79]"
                            />
                            <label htmlFor="entire_book" className="text-sm font-medium cursor-pointer">
                              Entire Book {totalPages > 0 && `(${totalPages} pages)`}
                            </label>
                          </div>

                          {hasChapters && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="chapters"
                                name="contentSource"
                                value="chapters"
                                checked={contentSource === 'chapters'}
                                onChange={(e) => setContentSource(e.target.value as ContentSource)}
                                className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79]"
                              />
                              <label htmlFor="chapters" className="text-sm font-medium cursor-pointer">
                                Select Chapters ({chapters.length} available)
                              </label>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="pages"
                              name="contentSource"
                              value="pages"
                              checked={contentSource === 'pages'}
                              onChange={(e) => setContentSource(e.target.value as ContentSource)}
                              className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79]"
                            />
                            <label htmlFor="pages" className="text-sm font-medium cursor-pointer">
                              Select Page Range
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chapter Multi-Select */}
                    {contentSource === 'chapters' && hasChapters && (
                      <div className="space-y-2">
                        <Label>Select Chapters *</Label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <input
                              type="checkbox"
                              id="select_all_chapters"
                              checked={selectedChapters.length === chapters.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChapters(chapters.map(ch => ch.chapter_number));
                                } else {
                                  setSelectedChapters([]);
                                }
                              }}
                              className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79] rounded"
                            />
                            <label htmlFor="select_all_chapters" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          {chapters.map((chapter) => (
                            <div key={chapter.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`chapter_${chapter.chapter_number}`}
                                checked={selectedChapters.includes(chapter.chapter_number)}
                                onChange={() => handleChapterToggle(chapter.chapter_number)}
                                className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79] rounded"
                              />
                              <label
                                htmlFor={`chapter_${chapter.chapter_number}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                Chapter {chapter.chapter_number}: {chapter.title}
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Pages {chapter.start_page}-{chapter.end_page})
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                        {selectedChapters.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {selectedChaptersLabel}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Page Range Selection */}
                    {contentSource === 'pages' && totalPages > 0 && (
                      <div className="space-y-2">
                        <Label>Page Range *</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="fromPage" className="text-xs">From Page</Label>
                            <Input
                              id="fromPage"
                              type="number"
                              min={1}
                              max={totalPages}
                              value={fromPage}
                              onChange={(e) => setFromPage(Number(e.target.value))}
                              placeholder="1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="toPage" className="text-xs">To Page</Label>
                            <Input
                              id="toPage"
                              type="number"
                              min={fromPage}
                              max={totalPages}
                              value={toPage}
                              onChange={(e) => setToPage(Number(e.target.value))}
                              placeholder={totalPages.toString()}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total pages available: {totalPages}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quiz Title */}
                <div className="space-y-2">
                  <Label>Quiz Title (Optional)</Label>
                  <Input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Leave empty for auto-generated title"
                  />
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value: any) => setDifficulty(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Count */}
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Between 1 and 50 questions
                  </p>
                </div>

                {/* Question Types */}
                <div className="space-y-2">
                  <Label>Question Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "mcq", label: "Multiple Choice" },
                      { value: "true_false", label: "True/False" },
                      { value: "short_answer", label: "Short Answer" },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={
                          questionTypes.includes(type.value)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleQuestionTypeToggle(type.value)}
                        className={
                          questionTypes.includes(type.value)
                            ? "bg-[#99CE79] hover:bg-[#88bd68] text-gray-900"
                            : ""
                        }
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !selectedBook || success}
                  className="w-full bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Quiz Generated!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">1.</span>
                  <span>Select a book from your library</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">2.</span>
                  <span>Choose a specific chapter or use all content</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">3.</span>
                  <span>Configure difficulty and question types</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">4.</span>
                  <span>AI generates custom questions in seconds</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">5.</span>
                  <span>Take the quiz and track your progress</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Select specific chapters for focused quizzes</p>
                <p>• Mix question types for variety</p>
                <p>• Start with easy difficulty to build confidence</p>
                <p>• Generate multiple quizzes for practice</p>
                <p>• Review explanations after completing</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Monthly Limit
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-muted-foreground mb-2">
                  Quiz generations reset monthly
                </p>
                {quotaRemaining !== null && (
                  <p className="font-semibold">
                    {quotaRemaining} remaining this month
                  </p>
                )}
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Upgrade for More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
