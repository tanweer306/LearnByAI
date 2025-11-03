import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  MessageSquare,
  Upload,
  Brain,
  FileText,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  Award,
  Sparkles,
  BookMarked,
  GraduationCap,
  Zap,
  Video,
  Users,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import StudentHeader from "@/components/dashboard/StudentHeader";

export default async function StudentDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  // Fetch user data from Supabase
  let dbUser = null;
  let stats = {
    booksUploaded: 0,
    questionsAsked: 0,
    quizzesTaken: 0,
    averageScore: 0,
    studyStreak: 0,
    booksThisMonth: 0,
    quizzesThisMonth: 0,
  };

  let recentBooks: any[] = [];
  let recentQuizzes: any[] = [];
  let enrolledClasses: any[] = [];

  try {
    // Try to get user from Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    // If user doesn't exist, create them
    if (userError && userError.code === "PGRST116") {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from("users")
        .insert({
          clerk_user_id: userId,
          email: user?.emailAddresses[0]?.emailAddress || "",
          first_name: user?.firstName || null,
          last_name: user?.lastName || null,
          role: "student",
        })
        .select()
        .single();

      if (!createError) {
        dbUser = newUser;
      }
    } else if (!userError) {
      dbUser = userData;
    }

    if (dbUser) {
      // Fetch user statistics
      const [
        booksResult,
        quizAttemptsResult,
        questionsResult,
        streakResult,
        classesResult,
      ] = await Promise.allSettled([
          supabaseAdmin
            .from("books")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("quiz_attempts")
            .select("*, quizzes(*)")
            .eq("user_id", dbUser.id)
            .order("completed_at", { ascending: false }),
          supabaseAdmin
            .from("questions_asked")
            .select("id")
            .eq("user_id", dbUser.id),
          supabaseAdmin
            .from("study_streaks")
            .select("*")
            .eq("user_id", dbUser.id)
            .single(),
          supabaseAdmin
            .from("class_members")
            .select(
              `
              *,
              classes!inner(
                id,
                name,
                subject,
                description,
                users!classes_teacher_id_fkey(
                  first_name,
                  last_name
                )
              )
            `
            )
            .eq("user_id", dbUser.id)
            .eq("role", "student"),
        ]);

      const books =
        booksResult.status === "fulfilled" ? booksResult.value.data : [];
      const quizAttempts =
        quizAttemptsResult.status === "fulfilled"
          ? quizAttemptsResult.value.data
          : [];
      const questionsAsked =
        questionsResult.status === "fulfilled"
          ? questionsResult.value.data
          : [];
      const studyStreak =
        streakResult.status === "fulfilled" ? streakResult.value.data : null;
      const classes =
        classesResult.status === "fulfilled" ? classesResult.value.data : [];

      // Calculate books this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const booksThisMonth =
        books?.filter((book: any) => new Date(book.created_at) >= startOfMonth)
          .length || 0;

      const quizzesThisMonth =
        quizAttempts?.filter(
          (attempt: any) => new Date(attempt.completed_at) >= startOfMonth,
        ).length || 0;

      stats = {
        booksUploaded: books?.length || 0,
        questionsAsked: questionsAsked?.length || 0,
        quizzesTaken: quizAttempts?.length || 0,
        averageScore: quizAttempts?.length
          ? Math.round(
              quizAttempts.reduce(
                (acc: number, curr: any) =>
                  acc + (curr.score / curr.total_questions) * 100,
                0,
              ) / quizAttempts.length,
            )
          : 0,
        studyStreak: studyStreak?.current_streak || 0,
        booksThisMonth,
        quizzesThisMonth,
      };

      recentBooks = books?.slice(0, 3) || [];
      recentQuizzes = quizAttempts?.slice(0, 3) || [];
      enrolledClasses = classes || [];
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Continue with default stats
  }

  // Check free tier limits
  const freeLimit = {
    books: 3,
    quizzes: 10,
  };

  const isNearBookLimit = stats.booksThisMonth >= freeLimit.books - 1;
  const isNearQuizLimit = stats.quizzesThisMonth >= freeLimit.quizzes - 2;

  return (
    <div className="min-h-screen bg-background" data-oid="9iimwdp">
      <StudentHeader
        userName={user?.firstName || "Student"}
        data-oid="lldd6fo"
      />

      <main
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-oid="sq_32mn"
      >
        {/* Welcome Section with Quick Stats */}
        <div className="mb-8" data-oid="joyj27g">
          <div
            className="flex items-start justify-between flex-wrap gap-4"
            data-oid="-il7kx4"
          >
            <div data-oid="qf2n79-">
              <h1
                className="text-3xl md:text-4xl font-bold mb-2"
                data-oid="2-vri:d"
              >
                Welcome back, {user?.firstName || "there"}! 👋
              </h1>
              <p className="text-lg text-muted-foreground" data-oid="ib26f9g">
                Ready to continue your learning journey?
              </p>
            </div>

            {/* Streak Badge */}
            {stats.studyStreak > 0 && (
              <div
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-lg"
                data-oid="j958t_f"
              >
                <Zap
                  className="h-5 w-5"
                  fill="currentColor"
                  data-oid="w6ep1bw"
                />
                <span className="font-bold" data-oid="g8_6h8o">
                  {stats.studyStreak} Day Streak!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Free Tier Alerts */}
        {(isNearBookLimit || isNearQuizLimit) && (
          <div
            className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
            data-oid="098:e1b"
          >
            <div className="flex items-start gap-3" data-oid="ytaevip">
              <Sparkles
                className="h-5 w-5 text-amber-600 mt-0.5"
                data-oid="al41x7w"
              />
              <div className="flex-1" data-oid=":wlgu88">
                <h3
                  className="font-semibold text-amber-900 dark:text-amber-100 mb-1"
                  data-oid="ke5yvo:"
                >
                  You're approaching your free tier limits
                </h3>
                <p
                  className="text-sm text-amber-700 dark:text-amber-300"
                  data-oid="lc6y74_"
                >
                  {isNearBookLimit &&
                    `Books this month: ${stats.booksThisMonth}/${freeLimit.books}. `}
                  {isNearQuizLimit &&
                    `Quizzes this month: ${stats.quizzesThisMonth}/${freeLimit.quizzes}. `}
                  <Link
                    href="/pricing"
                    className="underline font-medium"
                    data-oid="4e3-88e"
                  >
                    Upgrade to Premium
                  </Link>{" "}
                  for unlimited access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          data-oid="7q.72:g"
        >
          {/* Books Uploaded */}
          <div
            className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900/50 dark:to-gray-800/50 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="ot:yq8z"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="xuwq_bx"
            >
              <div
                className="h-12 w-12 rounded-xl bg-gray-700 dark:bg-gray-600 flex items-center justify-center"
                data-oid="82m9sfx"
              >
                <BookOpen className="h-6 w-6 text-white" data-oid="if8thnf" />
              </div>
              <div className="text-right" data-oid="6o9m7dq">
                <p
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full"
                  data-oid="ih3oc0m"
                >
                  {stats.booksThisMonth} this month
                </p>
              </div>
            </div>
            <p
              className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1"
              data-oid="ljnf3x."
            >
              {stats.booksUploaded}
            </p>
            <p
              className="text-sm text-gray-700 dark:text-gray-300 font-medium"
              data-oid="n-5h575"
            >
              Books Uploaded
            </p>
          </div>

          {/* Questions Asked */}
          <div
            className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="9.k5nj_"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="a434yl8"
            >
              <div
                className="h-12 w-12 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center"
                data-oid="r.m7cpc"
              >
                <MessageSquare
                  className="h-6 w-6 text-white"
                  data-oid="9mewu1u"
                />
              </div>
              <div
                className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center"
                data-oid="rsg6yyn"
              >
                <Brain className="h-4 w-4 text-white" data-oid="s84idrn" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1"
              data-oid="xs_b-.q"
            >
              {stats.questionsAsked}
            </p>
            <p
              className="text-sm text-blue-700 dark:text-blue-300 font-medium"
              data-oid="f0bq.sd"
            >
              AI Questions
            </p>
          </div>

          {/* Quizzes Taken */}
          <div
            className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="rhy62zd"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="k6xxolj"
            >
              <div
                className="h-12 w-12 rounded-xl bg-green-600 dark:bg-green-500 flex items-center justify-center"
                data-oid="2ko.3rg"
              >
                <FileText className="h-6 w-6 text-white" data-oid="lhfo19q" />
              </div>
              <div className="text-right" data-oid="r8wq_9n">
                <p
                  className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-700 px-2 py-1 rounded-full"
                  data-oid="12fwluk"
                >
                  {stats.quizzesThisMonth} this month
                </p>
              </div>
            </div>
            <p
              className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1"
              data-oid="igt1o5a"
            >
              {stats.quizzesTaken}
            </p>
            <p
              className="text-sm text-green-700 dark:text-green-300 font-medium"
              data-oid="d:dmihf"
            >
              Quizzes Completed
            </p>
          </div>

          {/* Average Score */}
          <div
            className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="_7_h3no"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="hz6742p"
            >
              <div
                className="h-12 w-12 rounded-xl bg-orange-600 dark:bg-orange-500 flex items-center justify-center"
                data-oid="vy.24-."
              >
                <Trophy className="h-6 w-6 text-white" data-oid="55_sg5:" />
              </div>
              <div className="flex items-center gap-1" data-oid="id4i_6o">
                {stats.averageScore >= 80 ? (
                  <TrendingUp
                    className="h-4 w-4 text-green-600"
                    data-oid="xmx2-i6"
                  />
                ) : (
                  <Target
                    className="h-4 w-4 text-orange-600"
                    data-oid="i09f:io"
                  />
                )}
              </div>
            </div>
            <p
              className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1"
              data-oid="gc_9na5"
            >
              {stats.averageScore}%
            </p>
            <p
              className="text-sm text-orange-700 dark:text-orange-300 font-medium"
              data-oid="dq:e950"
            >
              Average Score
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          data-oid="re8h_k7"
        >
          {/* Quick Actions - Takes 2 columns */}
          <div className="lg:col-span-2" data-oid="-2pyy:d">
            <div className="bg-card border-2 rounded-xl p-6" data-oid="63813ow">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                data-oid=".h1_kj:"
              >
                <Zap
                  className="h-5 w-5 text-gray-600 dark:text-gray-400"
                  data-oid="ifzn07_"
                />
                Quick Actions
              </h2>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                data-oid="yf:dihd"
              >
                {/* Upload Book */}
                <Link
                  href="/dashboard/books/upload"
                  className="group"
                  data-oid="n38ne_7"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-gray-600 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="sc.bb9i"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="ap_l_7x"
                    >
                      <Upload
                        className="h-8 w-8 text-gray-700 dark:text-gray-300"
                        data-oid="d2xoug1"
                      />
                      {stats.booksThisMonth < freeLimit.books && (
                        <span
                          className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full"
                          data-oid="yq201j0"
                        >
                          {freeLimit.books - stats.booksThisMonth} left
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="4v_yl3r">
                      Upload Book
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="m9jj215"
                    >
                      Add PDF, DOCX, or other formats
                    </p>
                  </div>
                </Link>

                {/* Generate Quiz */}
                <Link
                  href="/dashboard/quiz/generate"
                  className="group"
                  data-oid="0s8cf.h"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-green-600 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="-0y2-pp"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="7lgq81-"
                    >
                      <FileText
                        className="h-8 w-8 text-green-600 dark:text-green-400"
                        data-oid="ttc0zbp"
                      />
                      {stats.quizzesThisMonth < freeLimit.quizzes && (
                        <span
                          className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full"
                          data-oid="_w_yxi2"
                        >
                          {freeLimit.quizzes - stats.quizzesThisMonth} left
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="hl66low">
                      Generate Quiz
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="mdobq4m"
                    >
                      AI-powered MCQs from your books
                    </p>
                  </div>
                </Link>

                {/* Live Classes */}
                <Link
                  href="/dashboard/student/live-classes"
                  className="group"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-red-600 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer group-hover:scale-105"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                    >
                      <Video
                        className="h-8 w-8 text-red-600 dark:text-red-400"
                      />
                      <Sparkles
                        className="h-5 w-5 text-red-500"
                      />
                    </div>
                    <h3 className="font-semibold mb-1">
                      Live Classes
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                    >
                      Join scheduled live sessions
                    </p>
                  </div>
                </Link>

                {/* Study Plans */}
                <Link
                  href="/dashboard/study-plan/generate"
                  className="group"
                  data-oid="_-8za62"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-orange-600 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="rcs71ng"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="1p66lt."
                    >
                      <GraduationCap
                        className="h-8 w-8 text-orange-600 dark:text-orange-400"
                        data-oid="oek9duf"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="6x5-glo">
                      Study Plans
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid=":rzt7al"
                    >
                      Personalized learning schedules
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Learning Progress Sidebar */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="eiyom2p">
            <h2
              className="text-xl font-bold mb-6 flex items-center gap-2"
              data-oid="-j2tyjd"
            >
              <Trophy
                className="h-5 w-5 text-gray-600 dark:text-gray-400"
                data-oid="t9hk_jd"
              />
              Progress
            </h2>
            <div className="space-y-6" data-oid="0j:xaqj">
              {/* Study Streak */}
              <div data-oid="a0cc.es">
                <div
                  className="flex items-center justify-between mb-2"
                  data-oid="hpoil.b"
                >
                  <div className="flex items-center gap-2" data-oid="2a_fevf">
                    <div
                      className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"
                      data-oid="17pvanm"
                    >
                      <Zap
                        className="h-5 w-5 text-white"
                        fill="currentColor"
                        data-oid="qs8fnn0"
                      />
                    </div>
                    <div data-oid="56h4f7g">
                      <p className="text-sm font-medium" data-oid="kwpikjy">
                        Study Streak
                      </p>
                      <p
                        className="text-2xl font-bold text-orange-600"
                        data-oid="81nmewr"
                      >
                        {stats.studyStreak}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs text-muted-foreground"
                    data-oid="fgbur5x"
                  >
                    days
                  </span>
                </div>
                {stats.studyStreak === 0 ? (
                  <p
                    className="text-xs text-muted-foreground"
                    data-oid="r5p:40c"
                  >
                    Start learning today to begin your streak!
                  </p>
                ) : (
                  <p
                    className="text-xs text-green-600 dark:text-green-400"
                    data-oid="vdwfcah"
                  >
                    🔥 Keep it going! Study today to maintain your streak
                  </p>
                )}
              </div>

              <div className="border-t pt-4" data-oid="6.f3:bu">
                {/* Weekly Goal */}
                <div className="mb-4" data-oid="kj1w2fm">
                  <div
                    className="flex items-center justify-between mb-2"
                    data-oid="p3oxul6"
                  >
                    <div className="flex items-center gap-2" data-oid="tw6aw6z">
                      <Target
                        className="h-5 w-5 text-green-600"
                        data-oid="jr8nikh"
                      />
                      <span className="text-sm font-medium" data-oid="96pned1">
                        Weekly Goal
                      </span>
                    </div>
                    <span className="text-sm font-semibold" data-oid="qxm4g34">
                      0/5 hours
                    </span>
                  </div>
                  <div
                    className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"
                    data-oid="k.-a_zw"
                  >
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all"
                      style={{ width: "0%" }}
                      data-oid="4oka_z9"
                    />
                  </div>
                  <p
                    className="text-xs text-muted-foreground mt-1"
                    data-oid="pu45po6"
                  >
                    Start studying to reach your goal!
                  </p>
                </div>

                {/* Performance Trend */}
                <div data-oid="i-irdaw">
                  <div
                    className="flex items-center justify-between mb-2"
                    data-oid="wb8pqfk"
                  >
                    <div className="flex items-center gap-2" data-oid="ihpr0gd">
                      <TrendingUp
                        className="h-5 w-5 text-gray-600 dark:text-gray-400"
                        data-oid="8rlop5m"
                      />
                      <span className="text-sm font-medium" data-oid="64ctfiw">
                        Performance
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold text-gray-600 dark:text-gray-400"
                      data-oid="sbib.xu"
                    >
                      --
                    </span>
                  </div>
                  <p
                    className="text-xs text-muted-foreground"
                    data-oid="2ew61jh"
                  >
                    Take a quiz to see your performance
                  </p>
                </div>
              </div>

              <div className="border-t pt-4" data-oid="00crd:_">
                {/* Recent Achievements */}
                <div
                  className="flex items-center gap-2 mb-3"
                  data-oid="b70lk8k"
                >
                  <Award
                    className="h-5 w-5 text-yellow-600"
                    data-oid="xqraule"
                  />
                  <span className="text-sm font-medium" data-oid="ps6rwa:">
                    Achievements
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap" data-oid="sd0u70r">
                  <div
                    className="h-14 w-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center text-2xl opacity-30"
                    title="Upload First Book"
                    data-oid="ejaz6y0"
                  >
                    📚
                  </div>
                  <div
                    className="h-14 w-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center text-2xl opacity-30"
                    title="Quiz Master"
                    data-oid="8qd2c48"
                  >
                    🎯
                  </div>
                  <div
                    className="h-14 w-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center text-2xl opacity-30"
                    title="AI Explorer"
                    data-oid="qf8v9dh"
                  >
                    🤖
                  </div>
                </div>
                <p
                  className="text-xs text-muted-foreground mt-2"
                  data-oid="i-.hrg-"
                >
                  Complete actions to earn badges!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* My Classes Section */}
        {enrolledClasses.length > 0 && (
          <div className="mb-8">
            <div className="bg-card border-2 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  My Classes
                </h2>
                <span className="text-sm text-muted-foreground">
                  {enrolledClasses.length} {enrolledClasses.length === 1 ? "class" : "classes"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledClasses.map((enrollment: any) => {
                  const classData = enrollment.classes;
                  const teacher = classData.users;
                  return (
                    <div
                      key={enrollment.id}
                      className="border-2 rounded-lg p-4 hover:shadow-lg transition-all hover:border-blue-500"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {classData.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {classData.subject || "General"}
                          </p>
                        </div>
                      </div>
                      {classData.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {classData.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Users className="h-3 w-3" />
                        <span>
                          {teacher.first_name} {teacher.last_name}
                        </span>
                      </div>
                      <Link href={`/dashboard/student/live-classes`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Video className="h-4 w-4 mr-2" />
                          View Live Classes
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Section */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          data-oid="hqcjtbu"
        >
          {/* Recent Books */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="x:xh_nt">
            <div
              className="flex items-center justify-between mb-4"
              data-oid="7bae4y6"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="ty:e.62"
              >
                <BookMarked
                  className="h-5 w-5 text-gray-600 dark:text-gray-400"
                  data-oid="x:xaoz_"
                />
                Recent Books
              </h2>
              <Link href="/dashboard/books" data-oid="q8z56wc">
                <Button variant="ghost" size="sm" data-oid="v48m69b">
                  View All
                </Button>
              </Link>
            </div>

            {recentBooks.length > 0 ? (
              <div className="space-y-3" data-oid=":vpa1z9">
                {recentBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/dashboard/books/${book.id}`}
                    className="block"
                    data-oid="pazrxs_"
                  >
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                      data-oid="zyh_l2r"
                    >
                      <div
                        className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center flex-shrink-0"
                        data-oid="6u922fz"
                      >
                        <BookOpen
                          className="h-6 w-6 text-white"
                          data-oid="_l5vf4h"
                        />
                      </div>
                      <div className="flex-1 min-w-0" data-oid=".:-okiw">
                        <p className="font-medium truncate" data-oid="j5dh3lb">
                          {book.title}
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          data-oid="p0ehi8e"
                        >
                          {book.subject || "Uncategorized"} •{" "}
                          {book.total_pages || 0} pages
                        </p>
                        <p
                          className="text-xs text-muted-foreground mt-1"
                          data-oid="e1_j:hx"
                        >
                          {new Date(book.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          book.status === "ready"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        }`}
                        data-oid="5kk6_0a"
                      >
                        {book.status}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="wxj7l1v">
                <BookOpen
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="tk96q3:"
                />
                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="ywme7r7"
                >
                  No books uploaded yet
                </p>
                <Link href="/dashboard/books/upload" data-oid="q9xmwz8">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500"
                    data-oid="d2kjwfy"
                  >
                    <Upload className="h-4 w-4 mr-2" data-oid=".zwjqqy" />
                    Upload Your First Book
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Quizzes */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="4g1ze2j">
            <div
              className="flex items-center justify-between mb-4"
              data-oid="7-mwgp7"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="py_ckts"
              >
                <FileText
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  data-oid="eahyylh"
                />
                Recent Quizzes
              </h2>
              <Link href="/dashboard/quiz" data-oid="9wgp0on">
                <Button variant="ghost" size="sm" data-oid="0v0ybvp">
                  View All
                </Button>
              </Link>
            </div>

            {recentQuizzes.length > 0 ? (
              <div className="space-y-3" data-oid="71v6cne">
                {recentQuizzes.map((attempt) => {
                  const percentage = Math.round(
                    (attempt.score / attempt.total_questions) * 100,
                  );
                  return (
                    <Link
                      key={attempt.id}
                      href={`/dashboard/quiz/${attempt.quiz_id}/results/${attempt.id}`}
                      className="block"
                      data-oid="6-8ybwx"
                    >
                      <div
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                        data-oid="pmz5svo"
                      >
                        <div
                          className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            percentage >= 80
                              ? "bg-gradient-to-br from-green-500 to-emerald-600"
                              : percentage >= 60
                                ? "bg-gradient-to-br from-yellow-500 to-orange-600"
                                : "bg-gradient-to-br from-red-500 to-rose-600"
                          }`}
                          data-oid="7-s6g:j"
                        >
                          <span
                            className="text-white font-bold text-lg"
                            data-oid="kzqt8sh"
                          >
                            {percentage}%
                          </span>
                        </div>
                        <div className="flex-1 min-w-0" data-oid="-2bhuux">
                          <p
                            className="font-medium truncate"
                            data-oid="3ysaona"
                          >
                            {attempt.quizzes?.title || "Quiz"}
                          </p>
                          <p
                            className="text-sm text-muted-foreground"
                            data-oid="4dwfjxe"
                          >
                            {attempt.score}/{attempt.total_questions} correct
                          </p>
                          <p
                            className="text-xs text-muted-foreground mt-1"
                            data-oid="_u9wmni"
                          >
                            {new Date(
                              attempt.completed_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="u46ynx-">
                <FileText
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="xs4xqpa"
                />
                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="xqiwv5d"
                >
                  No quizzes taken yet
                </p>
                <Link href="/dashboard/quiz/generate" data-oid="1-acguh">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
                    data-oid="3cw34sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" data-oid="qa9qu3y" />
                    Generate Your First Quiz
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div
          className="mt-8 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 dark:from-gray-700 dark:via-gray-600 dark:to-gray-800 rounded-xl p-8 text-white"
          data-oid="9nerl49"
        >
          <div
            className="flex items-center justify-between flex-wrap gap-4"
            data-oid="g4nfzxi"
          >
            <div data-oid="awk3ksh">
              <h2 className="text-2xl font-bold mb-2" data-oid="ogfy7ts">
                Unlock Unlimited Learning
              </h2>
              <p className="text-white/90 mb-1" data-oid="uenc6.h">
                Upgrade to Premium for unlimited books, quizzes, and advanced AI
                features
              </p>
              <p className="text-sm text-white/75" data-oid="1:7bg.j">
                Just $4.99/month • Cancel anytime • 14-day money-back guarantee
              </p>
            </div>
            <Link href="/pricing" data-oid="_8yrpib">
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl hover:scale-105 transition-all"
                data-oid="su.q2si"
              >
                <Sparkles className="h-5 w-5 mr-2" data-oid="gby28j2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
