/**
 * Quiz List/History Page
 * View all quizzes and past attempts
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  BookOpen,
  Clock,
  Trophy,
  Play,
  Eye,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
  totalQuestions: number;
  book: { title: string };
  createdAt: string;
  attempts: Array<{
    id: string;
    score: number;
    completedAt: string;
  }>;
}

export default function QuizListPage() {
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "not-attempted">("all");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quiz/list");
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredQuizzes = () => {
    switch (filter) {
      case "completed":
        return quizzes.filter((q) => q.attempts.length > 0);
      case "not-attempted":
        return quizzes.filter((q) => q.attempts.length === 0);
      default:
        return quizzes;
    }
  };

  const getBestScore = (quiz: Quiz) => {
    if (quiz.attempts.length === 0) return null;
    return Math.max(...quiz.attempts.map((a) => a.score));
  };

  const getAverageScore = () => {
    const allAttempts = quizzes.flatMap((q) => q.attempts);
    if (allAttempts.length === 0) return 0;
    const sum = allAttempts.reduce((acc, a) => acc + a.score, 0);
    return sum / allAttempts.length;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredQuizzes = getFilteredQuizzes();

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

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
                  My Quizzes
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Practice and track your progress
              </p>
            </div>
            <Link href="/dashboard/quiz/generate">
              <Button className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Quiz
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {quizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizzes.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quizzes.filter((q) => q.attempts.length > 0).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getAverageScore().toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All ({quizzes.length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            size="sm"
          >
            Completed ({quizzes.filter((q) => q.attempts.length > 0).length})
          </Button>
          <Button
            variant={filter === "not-attempted" ? "default" : "outline"}
            onClick={() => setFilter("not-attempted")}
            size="sm"
          >
            Not Attempted ({quizzes.filter((q) => q.attempts.length === 0).length})
          </Button>
        </div>

        {/* Quiz List */}
        {filteredQuizzes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === "all"
                  ? "No quizzes yet"
                  : filter === "completed"
                    ? "No completed quizzes"
                    : "All quizzes have been attempted"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === "all"
                  ? "Generate your first AI-powered quiz to get started"
                  : "Try different filters to see your quizzes"}
              </p>
              {filter === "all" && (
                <Link href="/dashboard/quiz/generate">
                  <Button>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Quiz
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const bestScore = getBestScore(quiz);
              const attemptCount = quiz.attempts.length;

              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getDifficultyColor(quiz.difficulty)}>
                        {quiz.difficulty}
                      </Badge>
                      {attemptCount > 0 && (
                        <Badge variant="secondary">
                          {attemptCount} {attemptCount === 1 ? "attempt" : "attempts"}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2">
                      {quiz.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {quiz.book.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{quiz.totalQuestions} questions</span>
                      </div>
                      {bestScore !== null && (
                        <div className="flex items-center gap-2 font-semibold text-green-600">
                          <Trophy className="h-4 w-4" />
                          <span>{bestScore.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          {attemptCount > 0 ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Retake
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start
                            </>
                          )}
                        </Button>
                      </Link>
                      {attemptCount > 0 && (
                        <Link
                          href={`/dashboard/quiz/${quiz.id}/results/${quiz.attempts[0].id}`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Created {new Date(quiz.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Performance Insights */}
        {quizzes.length > 0 && quizzes.some((q) => q.attempts.length > 0) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#99CE79]" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Average Score by Difficulty
                  </p>
                  <div className="space-y-2">
                    {["easy", "medium", "hard"].map((difficulty) => {
                      const difficultyQuizzes = quizzes.filter(
                        (q) => q.difficulty === difficulty && q.attempts.length > 0
                      );
                      if (difficultyQuizzes.length === 0) return null;

                      const avgScore =
                        difficultyQuizzes.reduce((sum, q) => {
                          const scores = q.attempts.map((a) => a.score);
                          return sum + Math.max(...scores);
                        }, 0) / difficultyQuizzes.length;

                      return (
                        <div key={difficulty} className="flex items-center gap-4">
                          <span className="text-sm font-medium capitalize w-20">
                            {difficulty}
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getDifficultyColor(difficulty)}`}
                              style={{ width: `${avgScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {avgScore.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
