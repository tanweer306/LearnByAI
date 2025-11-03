/**
 * Quiz Results Page
 * Display score, detailed feedback, and explanations
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Clock,
  Target,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GradedAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score?: number; // 0-1 scale for partial credit
  marksEarned?: number;
  marksTotal?: number;
  marks?: number; // Legacy support
  feedback?: string; // AI grading feedback
  explanation: string | null;
}

interface Results {
  score: number;
  correctCount: number;
  totalQuestions: number;
  earnedMarks: number;
  totalMarks: number;
  timeTaken: number | null;
  passed: boolean;
}

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
}

export default function QuizResultsPage({
  params,
}: {
  params: { quizId: string; attemptId: string };
}) {
  const { user } = useUser();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [gradedAnswers, setGradedAnswers] = useState<GradedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExplanations, setShowExplanations] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);

      // Fetch quiz details
      const quizResponse = await fetch(`/api/quiz/${params.quizId}`);
      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || "Failed to fetch quiz");
      }

      setQuiz(quizData.quiz);

      // Fetch attempt results
      const resultsResponse = await fetch(
        `/api/quiz/${params.quizId}/attempts/${params.attemptId}`
      );
      const resultsData = await resultsResponse.json();

      if (!resultsResponse.ok) {
        throw new Error(resultsData.error || "Failed to fetch results");
      }

      setResults(resultsData.results);
      setGradedAnswers(resultsData.gradedAnswers);
    } catch (err: any) {
      console.error("Error fetching results:", err);
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
    if (score >= 60) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
    return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
  };

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

  if (error || !quiz || !results) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Results not found"}</AlertDescription>
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
              Quiz Results
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">{quiz.title}</p>
        </div>

        {/* Score Card */}
        <Card className={`mb-8 ${getScoreBgColor(results.score)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  results.passed ? "bg-green-500" : "bg-red-500"
                } text-white`}>
                  {results.passed ? (
                    <Trophy className="h-8 w-8" />
                  ) : (
                    <XCircle className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {results.passed ? "Congratulations!" : "Keep Practicing!"}
                  </h2>
                  <p className="text-muted-foreground">
                    {results.passed
                      ? "You passed the quiz!"
                      : "You can retake this quiz to improve your score"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${getScoreColor(results.score)}`}>
                  {results.score.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.earnedMarks} / {results.totalMarks} marks
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-[#99CE79]" />
                  <span className="text-sm text-muted-foreground">Correct Answers</span>
                </div>
                <p className="text-2xl font-bold">
                  {results.correctCount} / {results.totalQuestions}
                </p>
              </div>

              {results.timeTaken && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-[#99CE79]" />
                    <span className="text-sm text-muted-foreground">Time Taken</span>
                  </div>
                  <p className="text-2xl font-bold">{formatTime(results.timeTaken)}</p>
                </div>
              )}

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-[#99CE79]" />
                  <span className="text-sm text-muted-foreground">Difficulty</span>
                </div>
                <p className="text-2xl font-bold capitalize">{quiz.difficulty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => router.push(`/dashboard/quiz/${params.quizId}`)}
            className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
          <Button
            onClick={() => setShowExplanations(!showExplanations)}
            variant="outline"
          >
            {showExplanations ? "Hide" : "Show"} Explanations
          </Button>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Detailed Review</h2>

          {gradedAnswers.map((answer, index) => (
            <Card
              key={answer.questionId}
              className={answer.isCorrect ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {answer.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : answer.score && answer.score > 0 ? (
                        <div className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">
                          {Math.round(answer.score * 100)}
                        </div>
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        Question {index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({answer.marksEarned?.toFixed(1) || 0}/{answer.marksTotal || answer.marks || 1} marks)
                      </span>
                      {answer.score !== undefined && answer.score > 0 && answer.score < 1 && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                          Partial Credit: {Math.round(answer.score * 100)}%
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base">{answer.questionText}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User's Answer */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Your Answer:
                  </p>
                  <p className={`font-medium ${
                    answer.isCorrect 
                      ? "text-green-600" 
                      : answer.score && answer.score > 0 
                        ? "text-yellow-600" 
                        : "text-red-600"
                  }`}>
                    {answer.userAnswer || "(No answer provided)"}
                  </p>
                </div>

                {/* AI Feedback (for subjective questions) */}
                {answer.feedback && (
                  <div className={`rounded-lg p-3 ${
                    answer.isCorrect
                      ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                      : answer.score && answer.score > 0
                        ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                        : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                  }`}>
                    <p className="text-sm font-medium mb-1 flex items-center gap-2">
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                        AI Graded
                      </span>
                      Feedback:
                    </p>
                    <p className="text-sm">{answer.feedback}</p>
                  </div>
                )}

                {/* Correct Answer (if wrong) */}
                {!answer.isCorrect && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Correct Answer:
                    </p>
                    <p className="font-medium text-green-600">
                      {answer.correctAnswer}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                {showExplanations && answer.explanation && (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">
                      {answer.questionType === 'short_answer' || answer.questionType === 'long_answer' || answer.questionType === 'fill_blank'
                        ? 'Model Answer:'
                        : 'Explanation:'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {answer.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Score</span>
                <span className="text-sm font-medium">{results.score.toFixed(1)}%</span>
              </div>
              <Progress value={results.score} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Correct</p>
                <p className="text-2xl font-bold text-green-600">
                  {results.correctCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Incorrect</p>
                <p className="text-2xl font-bold text-red-600">
                  {results.totalQuestions - results.correctCount}
                </p>
              </div>
            </div>

            {results.score < 100 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {results.score >= 80
                    ? "Great job! Review the incorrect answers to achieve a perfect score."
                    : results.score >= 60
                      ? "Good effort! Practice more to improve your understanding."
                      : "Keep studying! Review the material and try again."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
