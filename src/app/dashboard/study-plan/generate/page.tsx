/**
 * Study Plan Generation Page
 * Create personalized study schedules with MongoDB integration
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
  Calendar,
  Clock,
  Target,
  Brain,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Book {
  id: string;
  title: string;
  page_count: number;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  start_page: number;
  end_page: number;
}

type ContentSource = 'entire_book' | 'chapters' | 'pages';
type TaskType = 'reading' | 'quiz' | 'review' | 'practice';

export default function GenerateStudyPlanPage() {
  const { user } = useUser();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Book and content selection
  const [selectedBook, setSelectedBook] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [hasChapters, setHasChapters] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  
  // Content source selection
  const [contentSource, setContentSource] = useState<ContentSource>('entire_book');
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  
  // Schedule configuration
  const [planTitle, setPlanTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  
  // Task configuration
  const [taskTypes, setTaskTypes] = useState<TaskType[]>(['reading', 'quiz']);
  const [aiOptimize, setAiOptimize] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

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
      setHasChapters(false);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };
  
  const handleBookChange = (bookId: string) => {
    setSelectedBook(bookId);
    setSelectedChapters([]);
    setContentSource('entire_book');
    
    if (bookId) {
      fetchChapters(bookId);
      
      // Auto-generate title
      const book = books.find(b => b.id === bookId);
      if (book && !planTitle) {
        setPlanTitle(`${book.title} Study Plan`);
      }
    }
  };
  
  const handleChapterToggle = (chapterNumber: number) => {
    setSelectedChapters(prev => 
      prev.includes(chapterNumber)
        ? prev.filter(n => n !== chapterNumber)
        : [...prev, chapterNumber]
    );
  };
  
  const handleDayToggle = (day: number) => {
    setStudyDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };
  
  const handleTaskTypeToggle = (type: TaskType) => {
    setTaskTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Memoized values
  const selectedBookData = useMemo(() => 
    books.find(b => b.id === selectedBook),
    [books, selectedBook]
  );
  
  const selectedChaptersLabel = useMemo(() => {
    if (selectedChapters.length === 0) return 'No chapters selected';
    if (selectedChapters.length === chapters.length) return 'All chapters selected';
    return `${selectedChapters.length} chapter${selectedChapters.length > 1 ? 's' : ''} selected`;
  }, [selectedChapters, chapters]);
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleGenerate = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!selectedBook) {
      setError("Please select a book");
      return;
    }
    
    if (!planTitle.trim()) {
      setError("Please enter a study plan title");
      return;
    }
    
    if (!startDate || !endDate) {
      setError("Please select start and end dates");
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      setError("Start date cannot be in the past");
      return;
    }
    
    if (end <= start) {
      setError("End date must be after start date");
      return;
    }
    
    if (studyDays.length === 0) {
      setError("Please select at least one study day");
      return;
    }
    
    if (taskTypes.length === 0) {
      setError("Please select at least one task type");
      return;
    }
    
    if (dailyGoalMinutes < 1 || dailyGoalMinutes > 1440) {
      setError("Daily goal must be between 1 and 1440 minutes");
      return;
    }
    
    // Content source validation
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

    setGenerating(true);

    try {
      const payload: any = {
        bookId: selectedBook,
        contentSource,
        title: planTitle.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        dailyGoalMinutes,
        studyDays,
        taskTypes,
        aiOptimize,
      };
      
      // Add content-specific fields
      if (contentSource === 'chapters') {
        payload.chapterNumbers = selectedChapters;
      } else if (contentSource === 'pages') {
        payload.fromPage = fromPage;
        payload.toPage = toPage;
      }
      
      const response = await fetch("/api/study-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate study plan");
      }

      setSuccess(true);

      // Redirect to study plan page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/study-plan`);
      }, 2000);
    } catch (err: any) {
      console.error("Error generating study plan:", err);
      setError(err.message || "Failed to generate study plan");
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
          <Link href="/dashboard/study-plan">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study Plans
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
              Generate Study Plan
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Create a personalized AI-powered study plan to achieve your learning goals
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Study plan generated successfully! Redirecting...
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
                  Study Plan Configuration
                </CardTitle>
                <CardDescription>
                  Tell us about your learning goals and we'll create a personalized plan
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
                    <Select value={selectedBook} onValueChange={handleBookChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a book...">
                          {selectedBookData?.title || "Choose a book..."}
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
                  {selectedBookData && (
                    <p className="text-xs text-muted-foreground">
                      {selectedBookData.page_count} pages
                    </p>
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

                {/* Plan Title */}
                <div className="space-y-2">
                  <Label>Study Plan Title *</Label>
                  <Input
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="e.g., Biology Final Exam Preparation"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for this study plan..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                </div>

                {/* Daily Goal */}
                <div className="space-y-2">
                  <Label>Daily Study Goal (Minutes) *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={dailyGoalMinutes}
                    onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {dailyGoalMinutes} minutes = {Math.floor(dailyGoalMinutes / 60)}h {dailyGoalMinutes % 60}m per day
                  </p>
                </div>

                {/* Study Days */}
                <div className="space-y-2">
                  <Label>Study Days *</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDayToggle(index)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          studyDays.includes(index)
                            ? 'bg-[#99CE79] text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {studyDays.length} day{studyDays.length !== 1 ? 's' : ''} per week selected
                  </p>
                </div>

                {/* Task Types */}
                <div className="space-y-2">
                  <Label>Task Types *</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'reading' as TaskType, label: '📖 Reading', desc: 'Read chapters/pages' },
                      { value: 'quiz' as TaskType, label: '📝 Practice Quizzes', desc: 'Test your knowledge' },
                      { value: 'review' as TaskType, label: '🔄 Review Sessions', desc: 'Spaced repetition' },
                      { value: 'practice' as TaskType, label: '✏️ Practice Exercises', desc: 'Apply concepts' },
                    ].map((task) => (
                      <div key={task.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={task.value}
                          checked={taskTypes.includes(task.value)}
                          onChange={() => handleTaskTypeToggle(task.value)}
                          className="h-4 w-4 text-[#99CE79] focus:ring-[#99CE79] rounded"
                        />
                        <label htmlFor={task.value} className="text-sm cursor-pointer flex-1">
                          <span className="font-medium">{task.label}</span>
                          <span className="text-muted-foreground ml-2">- {task.desc}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At least one task type must be selected
                  </p>
                </div>

                {/* AI Optimization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-[#99CE79]" />
                        AI-Powered Optimization
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Let AI distribute tasks intelligently based on spaced repetition
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiOptimize(!aiOptimize)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        aiOptimize ? 'bg-[#99CE79]' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          aiOptimize ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !selectedBook || !planTitle || !startDate || !endDate || success}
                  className="w-full bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Study Plan...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Study Plan Generated!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Study Plan
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">1.</span>
                  <span>Select the book you want to study</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">2.</span>
                  <span>Define your learning goal and timeline</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">3.</span>
                  <span>Specify your current knowledge level</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">4.</span>
                  <span>AI creates a personalized week-by-week plan</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#99CE79] mt-0.5">5.</span>
                  <span>Track your progress and stay on schedule</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
