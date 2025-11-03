import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, BookOpen, TrendingUp, Award } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

export default async function TeacherAnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch teacher data
  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData) {
    redirect("/onboarding");
  }

  // Fetch analytics data
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("teacher_id", userData.id);

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("teacher_id", userData.id);

  // Get assignment submissions for analytics
  const { data: submissions } = await supabaseAdmin
    .from("assignment_submissions")
    .select(`
      *,
      assignments!inner(teacher_id)
    `)
    .eq("assignments.teacher_id", userData.id);

  const totalSubmissions = submissions?.length || 0;
  const pendingGrading = submissions?.filter(s => s.status === "submitted").length || 0;
  const gradedSubmissions = submissions?.filter(s => s.status === "graded" && s.score !== null) || [];
  const averageGrade = gradedSubmissions.length > 0
    ? Math.round(
        gradedSubmissions.reduce((sum, s) => sum + (s.score / s.total_points) * 100, 0) /
          gradedSubmissions.length
      )
    : 0;

  // Get class members count
  const { data: classMembers } = await supabaseAdmin
    .from("class_members")
    .select("student_id", { count: "exact" })
    .in("class_id", classes?.map(c => c.id) || []);

  const uniqueStudents = new Set(classMembers?.map(m => m.student_id) || []).size;

  const stats = {
    totalClasses: classes?.length || 0,
    totalAssignments: assignments?.length || 0,
    totalStudents: uniqueStudents,
    averageGrade,
    totalSubmissions,
    pendingGrading,
  };

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your teaching performance and student progress
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">{stats.totalClasses}</h3>
            <p className="text-sm text-muted-foreground">Total Classes</p>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">{stats.totalAssignments}</h3>
            <p className="text-sm text-muted-foreground">Assignments Created</p>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-950 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-950 p-3 rounded-lg">
                <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">
              {stats.averageGrade > 0 ? `${stats.averageGrade}%` : "N/A"}
            </h3>
            <p className="text-sm text-muted-foreground">Average Grade</p>
          </div>
        </div>

        {/* Assignment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <h3 className="text-2xl font-bold text-blue-600">{stats.totalSubmissions}</h3>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-2xl font-bold text-orange-600">{stats.pendingGrading}</h3>
            <p className="text-sm text-muted-foreground">Pending Grading</p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-2xl font-bold text-green-600">
              {stats.totalSubmissions - stats.pendingGrading}
            </h3>
            <p className="text-sm text-muted-foreground">Graded Submissions</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Class Performance</h3>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Performance chart coming soon</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Student Progress</h3>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                <p>Progress chart coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Assignments</h3>
          {assignments && assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, 5).map((assignment: any) => {
                const assignmentSubmissions = submissions?.filter(s => s.assignment_id === assignment.id) || [];
                const submittedCount = assignmentSubmissions.filter(s => s.status !== "draft").length;
                
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {submittedCount} / {assignmentSubmissions.length} submitted
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{assignment.total_points} pts</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assignments created yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
