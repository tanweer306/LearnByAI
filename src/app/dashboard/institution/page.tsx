import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Award,
  Settings,
  Plus,
  UserPlus,
  Building2,
  FileText,
  Brain,
  DollarSign,
  Upload,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  // Fetch institution data
  let dbUser = null;
  let stats = {
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalBooks: 0,
    activeAssignments: 0,
    platformUsage: 0,
    averagePerformance: 0,
  };

  let recentTeachers: any[] = [];
  let recentClasses: any[] = [];

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
          role: "admin",
        })
        .select()
        .single();
      dbUser = newUser;
    } else if (!userError) {
      dbUser = userData;
    }

    if (dbUser) {
      // For institution dashboard, we need to aggregate data from all teachers
      // Simplified version - in production, you'd have institution_id to link teachers
      const [teachersResult, studentsResult, classesResult, booksResult] =
        await Promise.allSettled([
          supabaseAdmin
            .from("users")
            .select("*")
            .eq("role", "teacher")
            .order("created_at", { ascending: false })
            .limit(5),
          supabaseAdmin.from("users").select("id").eq("role", "student"),
          supabaseAdmin
            .from("classes")
            .select("*, users!classes_teacher_id_fkey(*)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabaseAdmin.from("books").select("id"),
        ]);

      const teachers =
        teachersResult.status === "fulfilled" ? teachersResult.value.data : [];
      const students =
        studentsResult.status === "fulfilled" ? studentsResult.value.data : [];
      const classes =
        classesResult.status === "fulfilled" ? classesResult.value.data : [];
      const books =
        booksResult.status === "fulfilled" ? booksResult.value.data : [];

      stats = {
        totalTeachers: teachers?.length || 0,
        totalStudents: students?.length || 0,
        totalClasses: classes?.length || 0,
        totalBooks: books?.length || 0,
        activeAssignments: 0,
        platformUsage: 75, // Placeholder
        averagePerformance: 82, // Placeholder
      };

      recentTeachers = teachers?.slice(0, 5) || [];
      recentClasses = classes?.slice(0, 5) || [];
    }
  } catch (error) {
    console.error("Error fetching institution data:", error);
  }

  return (
    <div className="min-h-screen bg-background" data-oid="46g-.p2">
      <InstitutionHeader
        userName={user?.firstName || "Admin"}
        data-oid="mmslbxh"
      />

      <main
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-oid="mh_q4ya"
      >
        {/* Welcome Section */}
        <div className="mb-8" data-oid="xcba1:4">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            data-oid="qf6ba0u"
          >
            <span
              className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid="3ksh_9z"
            >
              {dbUser?.institution_name || "Institution"}
            </span>{" "}
            Dashboard 🏫
          </h1>
          <p className="text-lg text-muted-foreground" data-oid="010.4nl">
            Manage your institution's learning ecosystem
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          data-oid="l3np9-5"
        >
          {/* Total Teachers */}
          <div
            className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 hover:shadow-lg transition-all"
            data-oid="zzk4hh9"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="0op1630"
            >
              <div
                className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center"
                data-oid="fmpg:-g"
              >
                <GraduationCap
                  className="h-6 w-6 text-white"
                  data-oid="n:_5.zt"
                />
              </div>
              <TrendingUp
                className="h-5 w-5 text-blue-600"
                data-oid="6r6u3wn"
              />
            </div>
            <p
              className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1"
              data-oid="rmkj335"
            >
              {stats.totalTeachers}
            </p>
            <p
              className="text-sm text-blue-700 dark:text-blue-300 font-medium"
              data-oid="-z_g4zm"
            >
              Teachers
            </p>
          </div>

          {/* Total Students */}
          <div
            className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 border-2 border-green-300 dark:border-green-700 rounded-xl p-6 hover:shadow-lg transition-all"
            data-oid="u:plotd"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="_i.y115"
            >
              <div
                className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center"
                data-oid="ckdcrch"
              >
                <Users className="h-6 w-6 text-white" data-oid="8.qyeh7" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1"
              data-oid="x4gdmmd"
            >
              {stats.totalStudents}
            </p>
            <p
              className="text-sm text-green-700 dark:text-green-300 font-medium"
              data-oid="eq9odc3"
            >
              Students
            </p>
          </div>

          {/* Total Classes */}
          <div
            className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 hover:shadow-lg transition-all"
            data-oid="2579atd"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="a83.3nn"
            >
              <div
                className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center"
                data-oid="7b:h6:i"
              >
                <Building2 className="h-6 w-6 text-white" data-oid="b.oqnsk" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1"
              data-oid="7nhx3yk"
            >
              {stats.totalClasses}
            </p>
            <p
              className="text-sm text-purple-700 dark:text-purple-300 font-medium"
              data-oid="3-ixn.1"
            >
              Active Classes
            </p>
          </div>

          {/* Average Performance */}
          <div
            className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6 hover:shadow-lg transition-all"
            data-oid="x4pf0x7"
          >
            <div
              className="flex items-start justify-between mb-4"
              data-oid="bh0g.36"
            >
              <div
                className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center"
                data-oid="awi:7jf"
              >
                <Award className="h-6 w-6 text-white" data-oid="a.rv2wb" />
              </div>
            </div>
            <p
              className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1"
              data-oid="cov7nv1"
            >
              {stats.averagePerformance}%
            </p>
            <p
              className="text-sm text-orange-700 dark:text-orange-300 font-medium"
              data-oid="7ghiek7"
            >
              Avg Performance
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          data-oid=":z71vom"
        >
          {/* Quick Actions */}
          <div className="lg:col-span-2" data-oid="ejww:qt">
            <div className="bg-card border-2 rounded-xl p-6" data-oid="3r5jbil">
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-2"
                data-oid="mli30wt"
              >
                <Brain className="h-5 w-5 text-[#99CE79]" data-oid="o3a0v-." />
                <span
                  className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                  data-oid="u.dandu"
                >
                  Quick Actions
                </span>
              </h2>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                data-oid="k6sa6_j"
              >
                {/* Upload Materials */}
                <Link
                  href="/dashboard/institution/books/upload"
                  className="group"
                  data-oid="qx4w._8"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-purple-600 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid=".src6pm"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="i:g0mx:"
                    >
                      <Upload
                        className="h-8 w-8 text-purple-600 dark:text-purple-400"
                        data-oid="2wlryt9"
                      />
                      <BookOpen
                        className="h-5 w-5 text-purple-500"
                        data-oid=".h40j_j"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="q:gexhr">
                      Upload Materials
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid=".asbevi"
                    >
                      Add books and resources for classes
                    </p>
                  </div>
                </Link>

                {/* Add Teacher */}
                <Link
                  href="/dashboard/institution/teachers/add"
                  className="group"
                  data-oid="hya9s4j"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="w5oyqzj"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="hh79bal"
                    >
                      <UserPlus
                        className="h-8 w-8 text-blue-600 dark:text-blue-400"
                        data-oid="r6x6_5a"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="kuxlgk4">
                      Add Teacher
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="_cny-ft"
                    >
                      Invite new teachers to platform
                    </p>
                  </div>
                </Link>

                {/* Manage Classes */}
                <Link
                  href="/dashboard/institution/classes"
                  className="group"
                  data-oid="vk3.g:e"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-purple-600 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="eolj32-"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid=":bvw8b3"
                    >
                      <Building2
                        className="h-8 w-8 text-purple-600 dark:text-purple-400"
                        data-oid="wxmpu51"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="6a30c24">
                      Manage Classes
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="mx_ut9l"
                    >
                      Oversee all classes and teachers
                    </p>
                  </div>
                </Link>

                {/* View Analytics */}
                <Link
                  href="/dashboard/institution/analytics"
                  className="group"
                  data-oid="szsq0ei"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-green-600 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="mcfnow."
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="h82m4t:"
                    >
                      <BarChart3
                        className="h-8 w-8 text-green-600 dark:text-green-400"
                        data-oid="eh2pck8"
                      />

                      <TrendingUp
                        className="h-5 w-5 text-green-500"
                        data-oid="yc03irg"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid="t532028">
                      Analytics
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="urvrzs3"
                    >
                      School-wide performance insights
                    </p>
                  </div>
                </Link>

                {/* Settings */}
                <Link
                  href="/dashboard/institution/settings"
                  className="group"
                  data-oid="zwu5199"
                >
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-gray-600 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all cursor-pointer group-hover:scale-105"
                    data-oid="kzp940z"
                  >
                    <div
                      className="flex items-start justify-between mb-3"
                      data-oid="iqvn_xl"
                    >
                      <Settings
                        className="h-8 w-8 text-gray-600 dark:text-gray-400"
                        data-oid="yhmnkxn"
                      />
                    </div>
                    <h3 className="font-semibold mb-1" data-oid=":8y6eox">
                      Settings
                    </h3>
                    <p
                      className="text-sm text-muted-foreground"
                      data-oid="sg00rqg"
                    >
                      Configure institution preferences
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Platform Overview Sidebar */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="-vkghmz">
            <h2
              className="text-xl font-bold mb-6 flex items-center gap-2"
              data-oid="w:q6uz-"
            >
              <BarChart3
                className="h-5 w-5 text-[#99CE79]"
                data-oid="ydmen:i"
              />

              <span
                className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
                data-oid="722p-6a"
              >
                Overview
              </span>
            </h2>
            <div className="space-y-4" data-oid=":y4hkpp">
              {/* Platform Usage */}
              <div data-oid="ts6vn1x">
                <div
                  className="flex items-center justify-between mb-2"
                  data-oid="w1lmo2-"
                >
                  <span className="text-sm font-medium" data-oid="h8ln2zu">
                    Platform Usage
                  </span>
                  <span
                    className="text-2xl font-bold text-[#99CE79]"
                    data-oid="fmrg:a3"
                  >
                    {stats.platformUsage}%
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"
                  data-oid="wsmtbr9"
                >
                  <div
                    className="bg-gradient-to-r from-[#99CE79] to-[#E2FED3] h-2.5 rounded-full"
                    style={{ width: `${stats.platformUsage}%` }}
                    data-oid="._i4cpi"
                  />
                </div>
                <p
                  className="text-xs text-muted-foreground mt-1"
                  data-oid="l_6owq:"
                >
                  Teachers & students active this week
                </p>
              </div>

              {/* Books Library */}
              <div className="pt-4 border-t" data-oid="_tgk34l">
                <div
                  className="flex items-center gap-2 mb-2"
                  data-oid="zdzjwx9"
                >
                  <BookOpen
                    className="h-5 w-5 text-purple-600"
                    data-oid="6mlw14z"
                  />

                  <span className="text-sm font-medium" data-oid="7dxpjkp">
                    Content Library
                  </span>
                </div>
                <p className="text-2xl font-bold" data-oid="7m15h2k">
                  {stats.totalBooks}
                </p>
                <p
                  className="text-xs text-muted-foreground mt-1"
                  data-oid="74mhkq3"
                >
                  Books and resources uploaded
                </p>
              </div>

              {/* Active Assignments */}
              <div className="pt-4 border-t" data-oid="bn8fe1d">
                <div
                  className="flex items-center gap-2 mb-2"
                  data-oid="7rhv50q"
                >
                  <FileText
                    className="h-5 w-5 text-orange-600"
                    data-oid="u:9u2ff"
                  />

                  <span className="text-sm font-medium" data-oid="5jde_lr">
                    Active Assignments
                  </span>
                </div>
                <p className="text-2xl font-bold" data-oid="hw04ogu">
                  {stats.activeAssignments}
                </p>
                <p
                  className="text-xs text-muted-foreground mt-1"
                  data-oid="26av-9n"
                >
                  Ongoing assessments across all classes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Teachers & Classes Overview */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          data-oid="zkgzyzp"
        >
          {/* Teachers List */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="hk4_3sa">
            <div
              className="flex items-center justify-between mb-4"
              data-oid="zho2mt8"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="za6rebu"
              >
                <GraduationCap
                  className="h-5 w-5 text-blue-600"
                  data-oid="-n2dsc2"
                />
                Faculty Members
              </h2>
              <Link href="/dashboard/institution/teachers" data-oid="6bsr.7i">
                <Button variant="ghost" size="sm" data-oid="ym:xuxw">
                  View All
                </Button>
              </Link>
            </div>

            {recentTeachers.length > 0 ? (
              <div className="space-y-3" data-oid="3:j9906">
                {recentTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                    data-oid="jj10prr"
                  >
                    <div
                      className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 text-white font-semibold"
                      data-oid="51xgcbw"
                    >
                      {teacher.first_name?.[0] || "T"}
                      {teacher.last_name?.[0] || ""}
                    </div>
                    <div className="flex-1 min-w-0" data-oid="vonsd0f">
                      <p className="font-medium truncate" data-oid="1jmm.8q">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-oid="4fxu:64"
                      >
                        {teacher.subjects?.slice(0, 2).join(", ") || "Teacher"}
                      </p>
                      <p
                        className="text-xs text-muted-foreground mt-1"
                        data-oid="8e2shf8"
                      >
                        {teacher.years_of_experience || 0} years experience
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="p4wmjj5">
                <GraduationCap
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="y2sy0sx"
                />

                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="xf9mrgx"
                >
                  No teachers added yet
                </p>
                <Link
                  href="/dashboard/institution/teachers/add"
                  data-oid="ub9gia0"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-oid="d2t5q:4"
                  >
                    <UserPlus className="h-4 w-4 mr-2" data-oid="._v_ftb" />
                    Invite Teachers
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Classes */}
          <div className="bg-card border-2 rounded-xl p-6" data-oid="2q3mogw">
            <div
              className="flex items-center justify-between mb-4"
              data-oid=".4x25_j"
            >
              <h2
                className="text-xl font-bold flex items-center gap-2"
                data-oid="lbtjb:j"
              >
                <Building2
                  className="h-5 w-5 text-purple-600"
                  data-oid="9j6yyx:"
                />
                Active Classes
              </h2>
              <Link href="/dashboard/institution/classes" data-oid="sk0mhxl">
                <Button variant="ghost" size="sm" data-oid="5wnofa4">
                  View All
                </Button>
              </Link>
            </div>

            {recentClasses.length > 0 ? (
              <div className="space-y-3" data-oid="4p6skzr">
                {recentClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                    data-oid=":weq0b-"
                  >
                    <div
                      className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center flex-shrink-0"
                      data-oid="nd8z_1m"
                    >
                      <Building2
                        className="h-6 w-6 text-white"
                        data-oid=".rm0wih"
                      />
                    </div>
                    <div className="flex-1 min-w-0" data-oid="fmrnp7v">
                      <p className="font-medium truncate" data-oid="xvjcqm-">
                        {cls.name}
                      </p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-oid="vdbh0vz"
                      >
                        {cls.subject || "General"} • Grade {cls.grade_level}
                      </p>
                      <p
                        className="text-xs text-muted-foreground mt-1"
                        data-oid="dy1zu6:"
                      >
                        Teacher: {cls.users?.first_name || "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" data-oid="dzd5ct8">
                <Building2
                  className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50"
                  data-oid="zzels-u"
                />

                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-oid="jxnut:4"
                >
                  No active classes yet
                </p>
                <p className="text-xs text-muted-foreground" data-oid="27aqgrc">
                  Teachers will create classes once added
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Tools */}
        <div
          className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl p-8 border-2 border-gray-300 dark:border-gray-700"
          data-oid="v2o_v0d"
        >
          <h2 className="text-2xl font-bold mb-2" data-oid="238q_fr">
            <span
              className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text"
              data-oid=":a8qnxo"
            >
              Admin Tools & Management
            </span>
          </h2>
          <p className="text-muted-foreground mb-6" data-oid="o-1hkxn">
            Comprehensive tools to manage your educational institution
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            data-oid="ibxlfn0"
          >
            <Link href="/dashboard/institution/users" data-oid="daovfyz">
              <div
                className="p-4 bg-card rounded-lg border hover:border-[#99CE79] transition-colors"
                data-oid="v71flpo"
              >
                <Users
                  className="h-8 w-8 text-[#99CE79] mb-2"
                  data-oid="ld1p88m"
                />

                <p className="font-semibold text-sm" data-oid="t61jt0e">
                  User Management
                </p>
                <p className="text-xs text-muted-foreground" data-oid="x.rt9il">
                  Add/remove users
                </p>
              </div>
            </Link>
            <Link href="/dashboard/institution/analytics" data-oid="n:wfeg-">
              <div
                className="p-4 bg-card rounded-lg border hover:border-blue-600 transition-colors"
                data-oid="_eq..oo"
              >
                <BarChart3
                  className="h-8 w-8 text-blue-600 mb-2"
                  data-oid="wwx775z"
                />

                <p className="font-semibold text-sm" data-oid="-j419cz">
                  Analytics
                </p>
                <p className="text-xs text-muted-foreground" data-oid="yl:4sd4">
                  Detailed reports
                </p>
              </div>
            </Link>
            <Link href="/dashboard/institution/content" data-oid=":nuw0lv">
              <div
                className="p-4 bg-card rounded-lg border hover:border-purple-600 transition-colors"
                data-oid="7ky77ig"
              >
                <BookOpen
                  className="h-8 w-8 text-purple-600 mb-2"
                  data-oid="r44tb2j"
                />

                <p className="font-semibold text-sm" data-oid="ck2-vkx">
                  Content Moderation
                </p>
                <p className="text-xs text-muted-foreground" data-oid="dn8gpws">
                  Review materials
                </p>
              </div>
            </Link>
            <Link href="/dashboard/institution/subscription" data-oid="73pt0ju">
              <div
                className="p-4 bg-card rounded-lg border hover:border-orange-600 transition-colors"
                data-oid="jexliop"
              >
                <DollarSign
                  className="h-8 w-8 text-orange-600 mb-2"
                  data-oid="t4zwbzj"
                />

                <p className="font-semibold text-sm" data-oid="cxd7-6l">
                  Subscription
                </p>
                <p className="text-xs text-muted-foreground" data-oid="v:l8shl">
                  Manage billing
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
