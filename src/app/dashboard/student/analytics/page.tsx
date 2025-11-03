/**
 * Student Analytics Dashboard
 * Performance metrics, charts, and insights
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import StudentHeader from "@/components/dashboard/StudentHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  Trophy,
  TrendingUp,
  Flame,
  BookOpen,
  Target,
  Award,
  BarChart3,
} from "lucide-react";

export default async function AnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  // Fetch user from Supabase
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!dbUser) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <main className="container mx-auto px-4 py-8">
          <p>User not found</p>
        </main>
      </div>
    );
  }

  // Fetch analytics data
  const [quizAttemptsResult, booksResult, streakResult, studyPlansResult] =
    await Promise.allSettled([
      supabaseAdmin
        .from("quiz_attempts")
        .select(`
          *,
          quizzes (
            id,
            title,
            difficulty,
            total_questions,
            books (title)
          )
        `)
        .eq("user_id", dbUser.id)
        .order("completed_at", { ascending: false }),
      supabaseAdmin
        .from("books")
        .select("*")
        .eq("user_id", dbUser.id),
      supabaseAdmin
        .from("study_streaks")
        .select("*")
        .eq("user_id", dbUser.id)
        .single(),
      supabaseAdmin
        .from("study_plans")
        .select("*")
        .eq("user_id", dbUser.id),
    ]);

  const quizAttempts =
    quizAttemptsResult.status === "fulfilled" ? quizAttemptsResult.value.data || [] : [];
  const books =
    booksResult.status === "fulfilled" ? booksResult.value.data || [] : [];
  const streak =
    streakResult.status === "fulfilled" ? streakResult.value.data : null;
  const studyPlans =
    studyPlansResult.status === "fulfilled" ? studyPlansResult.value.data || [] : [];

  // Calculate metrics
  const totalQuizzes = quizAttempts.length;
  const averageScore =
    totalQuizzes > 0
      ? quizAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / totalQuizzes
      : 0;
  const totalStudyTime = quizAttempts.reduce(
    (sum, attempt) => sum + (attempt.time_taken || 0),
    0
  );
  const currentStreak = streak?.current_streak || 0;

  // Performance by difficulty
  const performanceByDifficulty = ["easy", "medium", "hard"].map((difficulty) => {
    const attempts = quizAttempts.filter(
      (a: any) => a.quizzes?.difficulty === difficulty
    );
    const avgScore =
      attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
        : 0;
    return {
      difficulty,
      avgScore: avgScore.toFixed(1),
      count: attempts.length,
    };
  });

  // Performance by book
  const performanceByBook = books.slice(0, 5).map((book: any) => {
    const bookAttempts = quizAttempts.filter(
      (a: any) => a.quizzes?.books?.title === book.title
    );
    const avgScore =
      bookAttempts.length > 0
        ? bookAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / bookAttempts.length
        : 0;
    return {
      bookTitle: book.title,
      avgScore: avgScore.toFixed(1),
      count: bookAttempts.length,
    };
  });

  // Recent activity
  const recentActivity = quizAttempts.slice(0, 10).map((attempt: any) => ({
    type: "quiz",
    title: attempt.quizzes?.title || "Quiz",
    score: attempt.score,
    date: new Date(attempt.completed_at).toLocaleDateString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
              Analytics Dashboard
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your learning progress and performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Study Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all activities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quizzes Completed
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuizzes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Overall performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Streak
                </CardTitle>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStreak} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                Keep it up! 🔥
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Difficulty */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#99CE79]" />
              Performance by Difficulty
            </CardTitle>
            <CardDescription>
              Your average scores across different difficulty levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceByDifficulty.map((item) => (
                <div key={item.difficulty} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {item.difficulty}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} {item.count === 1 ? "quiz" : "quizzes"} •{" "}
                      {item.avgScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.difficulty === "easy"
                          ? "bg-green-500"
                          : item.difficulty === "medium"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${item.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance by Book */}
        {performanceByBook.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#99CE79]" />
                Performance by Subject
              </CardTitle>
              <CardDescription>
                Your performance across different books
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceByBook.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {item.bookTitle}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} {item.count === 1 ? "quiz" : "quizzes"} •{" "}
                        {item.avgScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-[#99CE79] h-2 rounded-full"
                        style={{ width: `${item.avgScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#99CE79]" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest quiz attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        {activity.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity yet. Complete a quiz to see your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}