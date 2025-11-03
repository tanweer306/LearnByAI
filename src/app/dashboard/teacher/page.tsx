import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Upload,
  Plus,
  Calendar,
  Bell,
  Award,
  TrendingUp,
  FileText,
  Brain,
  Video,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

export default async function TeacherDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  // Fetch teacher data from Supabase
  let dbUser = null;
  let stats = {
    totalClasses: 0,
    totalStudents: 0,
    booksUploaded: 0,
    assignmentsCreated: 0,
    averageClassPerformance: 0,
  };

  let recentClasses: any[] = [];
  let recentAssignments: any[] = [];

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (userError && userError.code === "PGRST116") {
      const { data: newUser } = await supabaseAdmin
        .from("users")
        .insert({
          clerk_user_id: userId,
          email: user?.emailAddresses[0]?.emailAddress || "",
          first_name: user?.firstName || null,
          last_name: user?.lastName || null,
          role: "teacher",
        })
        .select()
        .single();
      dbUser = newUser;
    } else if (!userError) {
      dbUser = userData;
    }

    if (dbUser) {
      const [classesResult, booksResult, assignmentsResult] =
        await Promise.allSettled([
          supabaseAdmin.from("classes").select("*").eq("teacher_id", dbUser.id),
          supabaseAdmin
            .from("books")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("assignments")
            .select("*, classes(*)")
            .eq("teacher_id", dbUser.id)
            .order("created_at", { ascending: false }),
        ]);

      const classes =
        classesResult.status === "fulfilled" ? classesResult.value.data : [];
      const books =
        booksResult.status === "fulfilled" ? booksResult.value.data : [];
      const assignments =
        assignmentsResult.status === "fulfilled"
          ? assignmentsResult.value.data
          : [];

      stats = {
        totalClasses: classes?.length || 0,
        totalStudents: 0, // TODO: Count from class_members
        booksUploaded: books?.length || 0,
        assignmentsCreated: assignments?.length || 0,
        averageClassPerformance: 0,
      };

      recentClasses = classes?.slice(0, 3) || [];
      recentAssignments = assignments?.slice(0, 3) || [];
    }
  } catch (error) {
    console.error("Error fetching teacher data:", error);
  }

  return (
    <div className="min-h-screen bg-background" data-oid="e_a6pn5">
      <TeacherHeader
        userName={user?.firstName || "Teacher"}
        data-oid="09dbeu_"
      />

      <main
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-oid="r-v5q2l"
      >
        {/* Welcome Section */}
        <div className="mb-8" data-oid="s8jnnod">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            data-oid="36_q_pv"
          >
            <span
              className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="ek9kfam"
            >
              Welcome back, {user?.firstName || "there"}!
            </span>{" "}
            👨‍🏫
          </h1>
          <p className="text-lg text-muted-foreground" data-oid="afmmm5_">
            Manage your classes and track student progress
          </p>
        </div>

        {/* Main Stats Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          data-oid="9s4rflg"
        >
          {/* Total Classes */}
          <div
            className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="emd3lyc"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="l2:nbhr"
            >
              <div
                className="h-12 w-12 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center"
                data-oid="oj7xten"
              >
                <Users className="h-6 w-6 text-white" data-oid="2opqb3y" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1"
              data-oid="r9eee2r"
            >
              {stats.totalClasses}
            </p>
            <p
              className="text-sm text-blue-700 dark:text-blue-300 font-medium"
              data-oid="7w2641n"
            >
              Active Classes
            </p>
          </div>

          {/* Total Students */}
          <div
            className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="1dhm-3_"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="xuidh12"
            >
              <div
                className="h-12 w-12 rounded-xl bg-green-600 dark:bg-green-500 flex items-center justify-center"
                data-oid="jv:u_:k"
              >
                <Award className="h-6 w-6 text-white" data-oid="_w04d_l" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1"
              data-oid="652:a85"
            >
              {stats.totalStudents}
            </p>
            <p
              className="text-sm text-green-700 dark:text-green-300 font-medium"
              data-oid="rqoa98v"
            >
              Total Students
            </p>
          </div>

          {/* Books Uploaded */}
          <div
            className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="ah7qimm"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="alhzqu2"
            >
              <div
                className="h-12 w-12 rounded-xl bg-purple-600 dark:bg-purple-500 flex items-center justify-center"
                data-oid="nltqpc."
              >
                <BookOpen className="h-6 w-6 text-white" data-oid="e3g5o8c" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1"
              data-oid="g0lkhgv"
            >
              {stats.booksUploaded}
            </p>
            <p
              className="text-sm text-purple-700 dark:text-purple-300 font-medium"
              data-oid=":c35jx-"
            >
              Course Materials
            </p>
          </div>

          {/* Assignments Created */}
          <div
            className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            data-oid="7yhvojm"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="u9u3fv1"
            >
              <div
                className="h-12 w-12 rounded-xl bg-orange-600 dark:bg-orange-500 flex items-center justify-center"
                data-oid="5:j2_42"
              >
                <ClipboardList
                  className="h-6 w-6 text-white"
                  data-oid="2t22c84"
                />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1"
              data-oid="kf-u59v"
            >
              {stats.assignmentsCreated}
            </p>
            <p
              className="text-sm text-orange-700 dark:text-orange-300 font-medium"
              data-oid=".zfjetu"
            >
              Assignments
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          data-oid="1ljzhiv"
        >
          {/* Quick Actions - 2 columns */}
          <div className="lg:col-span-2" data-oid="boio:ng">
            <div className="bg-card border-2 rounded-xl p-6" data-oid="7e46u1y">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                data-oid="52koict"
              >
                <Brain className="h-5 w-5 text-[#99CE79]" data-oid="10.0w:j" />
                <span
                  className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                  data-oid="k3v2lg."
                >
                  Quick Actions
                </span>
              </h2>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                data-oid="fh92560"
              >
                {/* Create Class */}
                <Link
                  href="/dashboard/teacher/classes/create"
                  className="group"
                  data-oid="p2d_x8i"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="ycur1xq"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="vp2kgyo"
                    >
                      <Plus
                        className="h-8 w-8 text-blue-600 dark:text-blue-400"
                        data-oid="8sebc_d"
                      />
                      <Users
                        className="h-5 w-5 text-blue-500"
                        data-oid="uchf.v-"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="-gcxa9i">
                      Create Class
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="07vk-cx"
                    >
                      Set up a new class for your students
                    </p>
                  </div>
                </Link>

                {/* Upload Material */}
                <Link
                  href="/dashboard/teacher/books/upload"
                  className="group"
                  data-oid="5lu5saq"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-purple-600 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="clgsph3"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="7d_:-li"
                    >
                      <Upload
                        className="h-8 w-8 text-purple-600 dark:text-purple-400"
                        data-oid="cio3f:b"
                      />
                      <BookOpen
                        className="h-5 w-5 text-purple-500"
                        data-oid="26rzb1_"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="0lhw.c4">
                      Upload Material
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="0a_e5e_"
                    >
                      Share textbooks with your classes
                    </p>
                  </div>
                </Link>

                {/* Create Assignment */}
                <Link
                  href="/dashboard/teacher/assignments/create"
                  className="group"
                  data-oid="rhwmh6:"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-orange-600 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="g2m8w3f"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="c5wn0.z"
                    >
                      <ClipboardList
                        className="h-8 w-8 text-orange-600 dark:text-orange-400"
                        data-oid="55uzvlp"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="9_zuh0n">
                      Create Assignment
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="46.i6wz"
                    >
                      Generate AI quizzes for your class
                    </p>
                  </div>
                </Link>

                {/* Live Sessions */}
                <Link
                  href="/dashboard/teacher/live-sessions"
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
                      <Calendar
                        className="h-5 w-5 text-red-500"
                      />
                    </div>
                    <h3 className="font-semibold mb-1">
                      Live Sessions
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                    >
                      Schedule and manage live classes
                    </p>
                  </div>
                </Link>

                {/* View Analytics */}
                <Link
                  href="/dashboard/teacher/analytics"
                  className="group"
                  data-oid="mkkkc-o"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-green-600 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="g25797q"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="cqruku0"
                    >
                      <BarChart3
                        className="h-8 w-8 text-green-600 dark:text-green-400"
                        data-oid="xfhi26a"
                      />
                      <TrendingUp
                        className="h-5 w-5 text-green-500"
                        data-oid="4w_wge4"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="gxkoq2q">
                      Analytics
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="p88x-4a"
                    >
                      Track student performance
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Class Overview Sidebar */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="gsj._k8">
            <h2
              className="text-xl font-bold mb-6 flex items-center gap-2"
              data-oid="nmnn1ac"
            >
              <Users className="h-5 w-5 text-blue-600" data-oid="q8evojz" />
              <span
                className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                data-oid="9u88o52"
              >
                Class Overview
              </span>
            </h2>
            <div className="space-y-4" data-oid="2uwpovk">
              {/* Average Performance */}
              <div data-oid="mlwz_q1">
                <div
                  className="flex items-center justify-between mb-2"
                  data-oid=".w.d5:d"
                >
                  <span className="text-sm font-medium" data-oid="ut-lnh-">
                    Avg Performance
                  </span>
                  <span
                    className="text-2xl font-bold text-green-600"
                    data-oid="5555h0."
                  >
                    {stats.averageClassPerformance}%
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"
                  data-oid="t_8jweh"
                >
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full"
                    style={{ width: `${stats.averageClassPerformance}%` }}
                    data-oid="e9-pq7l"
                  />
                </div>
              </div>

              {/* Pending Assignments */}
              <div className="pt-4 border-t" data-oid="t2l2j9w">
                <div
                  className="flex items-center gap-2 mb-3"
                  data-oid="73_kfa3"
                >
                  <Bell
                    className="h-5 w-5 text-orange-600"
                    data-oid="x2q1lap"
                  />
                  <span className="text-sm font-medium" data-oid="04yzqh2">
                    Pending Reviews
                  </span>
                </div>
                <p className="text-2xl font-bold" data-oid="dmbj9vh">
                  0
                </p>
                <p
                  className="text-xs text-muted-foreground mt-1"
                  data-oid="3uxtuay"
                >
                  Assignments awaiting grading
                </p>
              </div>

              {/* This Week */}
              <div className="pt-4 border-t" data-oid="doej-9x">
                <div
                  className="flex items-center gap-2 mb-3"
                  data-oid="2_5dx-b"
                >
                  <Calendar
                    className="h-5 w-5 text-blue-600"
                    data-oid="mc:-if_"
                  />
                  <span className="text-sm font-medium" data-oid="ev3m.t.">
                    This Week
                  </span>
                </div>
                <div className="space-y-2" data-oid="27omk6m">
                  <div
                    className="flex justify-between text-sm"
                    data-oid="5pikz8y"
                  >
                    <span className="text-muted-foreground" data-oid="pli197s">
                      Classes taught
                    </span>
                    <span className="font-medium" data-oid="katyqee">
                      0
                    </span>
                  </div>
                  <div
                    className="flex justify-between text-sm"
                    data-oid="r1wfncd"
                  >
                    <span className="text-muted-foreground" data-oid="tggiqx3">
                      Quizzes created
                    </span>
                    <span className="font-medium" data-oid="zyuaxal">
                      0
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          data-oid="s-4-el2"
        >
          {/* My Classes */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="w__p13i">
            <div
              className="flex items-center justify-between mb-4"
              data-oid="t23eq6h"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="mksst3i"
              >
                <Users className="h-5 w-5 text-blue-600" data-oid="cl481m5" />
                My Classes
              </h2>
              <Link href="/dashboard/teacher/classes" data-oid="oxth_ep">
                <Button variant="ghost" size="sm" data-oid="w6c3qb:">
                  View All
                </Button>
              </Link>
            </div>

            {recentClasses.length > 0 ? (
              <div className="space-y-3" data-oid=":ln9_c1">
                {recentClasses.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/dashboard/teacher/classes/${cls.id}`}
                    className="block"
                    data-oid="33.842u"
                  >
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                      data-oid="h-3upp6"
                    >
                      <div
                        className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0"
                        data-oid="lv3v-s."
                      >
                        <Users
                          className="h-6 w-6 text-white"
                          data-oid="04dilt9"
                        />
                      </div>
                      <div className="flex-1 min-w-0" data-oid=":_4t8k:">
                        <p className="font-medium truncate" data-oid="0sau8k-">
                          {cls.name}
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          data-oid="7qry509"
                        >
                          {cls.subject || "General"} • Grade {cls.grade_level}
                        </p>
                        <p
                          className="text-xs text-muted-foreground mt-1"
                          data-oid="baqyrs8"
                        >
                          Code: {cls.class_code}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="w8d56bi">
                <Users
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="hvule:l"
                />
                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="c.rpo0m"
                >
                  No classes created yet
                </p>
                <Link
                  href="/dashboard/teacher/classes/create"
                  data-oid="-ul748z"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-oid="qpr1foo"
                  >
                    <Plus className="h-4 w-4 mr-2" data-oid="p48mg1:" />
                    Create Your First Class
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Assignments */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="rwhj::n">
            <div
              className="flex items-center justify-between mb-4"
              data-oid="-p5gdhr"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="qi9i-:g"
              >
                <ClipboardList
                  className="h-5 w-5 text-orange-600"
                  data-oid="rmhyheo"
                />
                Recent Assignments
              </h2>
              <Link href="/dashboard/teacher/assignments" data-oid="quom:8u">
                <Button variant="ghost" size="sm" data-oid="iy1p9ql">
                  View All
                </Button>
              </Link>
            </div>

            {recentAssignments.length > 0 ? (
              <div className="space-y-3" data-oid="w49_69v">
                {recentAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/dashboard/teacher/assignments/${assignment.id}`}
                    className="block"
                    data-oid="5u_8x-n"
                  >
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                      data-oid="gywgfdr"
                    >
                      <div
                        className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center flex-shrink-0"
                        data-oid="o1qrp5z"
                      >
                        <FileText
                          className="h-6 w-6 text-white"
                          data-oid="xuc6aa3"
                        />
                      </div>
                      <div className="flex-1 min-w-0" data-oid="zx8uwxq">
                        <p className="font-medium truncate" data-oid="1lsosen">
                          {assignment.title}
                        </p>
                        <p
                          className="text-sm text-muted-foreground"
                          data-oid="fl76k1t"
                        >
                          {assignment.classes?.name} • {assignment.total_marks}{" "}
                          marks
                        </p>
                        <p
                          className="text-xs text-muted-foreground mt-1"
                          data-oid="bcla6a5"
                        >
                          Due:{" "}
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="0_q3s0l">
                <ClipboardList
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="-j-yg0p"
                />
                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="6qayz3r"
                >
                  No assignments created yet
                </p>
                <Link
                  href="/dashboard/teacher/assignments/create"
                  data-oid="msbmtun"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    data-oid="2adu_:l"
                  >
                    <Plus className="h-4 w-4 mr-2" data-oid="3evt7lx" />
                    Create Assignment
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Teacher Tools Section */}
        <div
          className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl p-8 border-2 border-gray-300 dark:border-gray-700"
          data-oid="l8:q80b"
        >
          <h2 className="text-2xl font-bold mb-2" data-oid=".y.o9sg">
            <span
              className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="jxzmkv1"
            >
              Advanced Teacher Tools
            </span>
          </h2>
          <p className="text-muted-foreground mb-6" data-oid="d4w3nh.">
            Leverage AI to create engaging content and track student progress
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            data-oid="d1xrg.n"
          >
            <Link href="/dashboard/teacher/quiz-generator" data-oid="ako.32p">
              <div
                className="p-4 bg-card rounded-lg border hover:border-[#99CE79] transition-colors"
                data-oid="soqsi4s"
              >
                <Brain
                  className="h-8 w-8 text-[#99CE79] mb-2"
                  data-oid="kfcrpe1"
                />
                <p className="font-semibold text-sm" data-oid="3x:oikx">
                  AI Quiz Generator
                </p>
                <p className="text-xs text-muted-foreground" data-oid="okhnwm9">
                  Auto-create quizzes
                </p>
              </div>
            </Link>
            <Link href="/dashboard/teacher/grading" data-oid="9mzysyq">
              <div
                className="p-4 bg-card rounded-lg border hover:border-green-600 transition-colors"
                data-oid="9.-zy:s"
              >
                <Award
                  className="h-8 w-8 text-green-600 mb-2"
                  data-oid="uqnvhgf"
                />
                <p className="font-semibold text-sm" data-oid="nj61zdk">
                  Auto Grading
                </p>
                <p className="text-xs text-muted-foreground" data-oid="z.jb42s">
                  AI-powered grading
                </p>
              </div>
            </Link>
            <Link href="/dashboard/teacher/analytics" data-oid="eij_gme">
              <div
                className="p-4 bg-card rounded-lg border hover:border-blue-600 transition-colors"
                data-oid="fz3piux"
              >
                <BarChart3
                  className="h-8 w-8 text-blue-600 mb-2"
                  data-oid="ijrduv1"
                />
                <p className="font-semibold text-sm" data-oid="8p3cumm">
                  Student Analytics
                </p>
                <p className="text-xs text-muted-foreground" data-oid="yu3p9m4">
                  Performance insights
                </p>
              </div>
            </Link>
            <Link href="/dashboard/teacher/resources" data-oid="2--nplq">
              <div
                className="p-4 bg-card rounded-lg border hover:border-orange-600 transition-colors"
                data-oid="82:w63t"
              >
                <BookOpen
                  className="h-8 w-8 text-orange-600 mb-2"
                  data-oid="uu7w__d"
                />
                <p className="font-semibold text-sm" data-oid="vuj1vtc">
                  Resource Library
                </p>
                <p className="text-xs text-muted-foreground" data-oid="0jzc7gk">
                  Shared materials
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
