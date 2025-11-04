/**
 * Quiz Taking Page
 * Interactive quiz interface with timer and progress tracking
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: string;
  question_type: string;
  question_text: string;
  options: string[] | null;
  marks: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  totalQuestions: number;
  timeLimit: number | null;
  book: { id: string; title: string };
  chapter: { id: string; title: string; chapter_number: number } | null;
}

export default function QuizTakingPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { user } = useUser();
  const router = useRouter();
  const [quizId, setQuizId] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  useEffect(() => {
    params.then(p => {
      setQuizId(p.quizId);
      // Load saved answers from localStorage
      const savedAnswers = localStorage.getItem(`quiz_${p.quizId}_answers`);
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch (e) {
          console.error('Failed to load saved answers:', e);
        }
      }
    });
  }, [params]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (started && Object.keys(answers).length > 0 && quizId) {
      const saveInterval = setInterval(() => {
        localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(answers));
        console.log('Auto-saved answers');
      }, 30000); // 30 seconds

      return () => clearInterval(saveInterval);
    }
  }, [started, answers, quizId]);

  useEffect(() => {
    if (started && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmit(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [started, timeRemaining]);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/quiz/${quizId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch quiz");
      }

      setQuiz(data.quiz);
      setQuestions(data.questions);

      // Initialize time remaining if time limit is set
      if (data.quiz.timeLimit) {
        setTimeRemaining(data.quiz.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (err: any) {
      console.error("Error fetching quiz:", err);
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    setStartTime(Date.now());
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    // Immediate save on answer change
    if (quizId) {
      const updatedAnswers = { ...answers, [questionId]: answer };
      localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(updatedAnswers));
    }
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Confirm submission
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Submit anyway?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!quizId) return;
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      const response = await fetch(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeTaken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit quiz");
      }

      // Clear saved answers from localStorage
      localStorage.removeItem(`quiz_${quizId}_answers`);
      
      // Redirect to results page
      router.push(`/dashboard/quiz/${quizId}/results/${data.attemptId}`);
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      setError(err.message || "Failed to submit quiz");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAnsweredCount = () => Object.keys(answers).length;
  const getProgress = () => (getAnsweredCount() / questions.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#99CE79]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Quiz not found"}</AlertDescription>
          </Alert>
          <Link href="/dashboard/quiz">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {!started ? (
          // Quiz Start Screen
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                {quiz.description && (
                  <p className="text-muted-foreground mt-2">{quiz.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Questions</p>
                    <p className="text-2xl font-bold">{quiz.totalQuestions}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Difficulty</p>
                    <p className="text-2xl font-bold capitalize">{quiz.difficulty}</p>
                  </div>
                  {quiz.timeLimit && (
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Time Limit</p>
                      <p className="text-2xl font-bold">{quiz.timeLimit} min</p>
                    </div>
                  )}
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Book</p>
                    <p className="text-sm font-medium">{quiz.book.title}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Instructions:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Answer all questions to the best of your ability</li>
                    <li>You can navigate between questions using the buttons</li>
                    {quiz.timeLimit && <li>The quiz will auto-submit when time runs out</li>}
                    <li>Review your answers before submitting</li>
                    <li>You can take this quiz multiple times</li>
                  </ul>
                </div>

                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
                >
                  Start Quiz
                </Button>

                <Link href="/dashboard/quiz">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Quiz Taking Interface
          <div className="max-w-4xl mx-auto">
            {/* Header with Timer and Progress */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  <span className={timeRemaining < 60 ? "text-red-600" : ""}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {getAnsweredCount()} of {questions.length} answered
                </span>
                <span className="text-sm font-medium">{Math.round(getProgress())}%</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>

            {/* Question Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {currentQuestion.question_text}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? "mark" : "marks"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* MCQ or True/False */}
                {(currentQuestion.question_type === "mcq" ||
                  currentQuestion.question_type === "true_false") &&
                  currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option, index) => (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            answers[currentQuestion.id] === option
                              ? "border-[#99CE79] bg-[#99CE79]/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-[#99CE79]/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option}
                            checked={answers[currentQuestion.id] === option}
                            onChange={(e) =>
                              handleAnswerChange(currentQuestion.id, e.target.value)
                            }
                            className="w-4 h-4 text-[#99CE79]"
                          />
                          <span className="flex-1">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                {/* Short Answer */}
                {currentQuestion.question_type === "short_answer" && (
                  <div className="space-y-2">
                    <Label>Your Answer:</Label>
                    <Input
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      className="text-base"
                    />
                  </div>
                )}

                {/* Long Answer */}
                {currentQuestion.question_type === "long_answer" && (
                  <div className="space-y-2">
                    <Label>Your Answer:</Label>
                    <textarea
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      className="w-full min-h-[150px] p-3 border rounded-md"
                      rows={6}
                    />
                  </div>
                )}

                {/* Fill in the Blank */}
                {currentQuestion.question_type === "fill_blank" && (
                  <div className="space-y-2">
                    <Label>Fill in the blank:</Label>
                    <Input
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the word or phrase that completes the statement
                    </p>
                  </div>
                )}

                {/* Mark for Review Button */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                    className={markedForReview.has(currentQuestion.id) ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''}
                  >
                    {markedForReview.has(currentQuestion.id) ? '⭐ Marked for Review' : '☆ Mark for Review'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-2 flex-wrap">
                {questions.map((_, index) => {
                  const questionId = questions[index].id;
                  const isAnswered = !!answers[questionId];
                  const isMarked = markedForReview.has(questionId);
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`relative w-8 h-8 rounded-full text-sm font-medium transition-all ${
                        isCurrent
                          ? "bg-[#99CE79] text-gray-900 ring-2 ring-[#99CE79] ring-offset-2"
                          : isAnswered
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ''}${isMarked ? ' (Marked for review)' : ''}`}
                    >
                      {index + 1}
                      {isMarked && !isCurrent && (
                        <span className="absolute -top-1 -right-1 text-yellow-500">⭐</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
