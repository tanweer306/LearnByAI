import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users, CheckCircle, Clock, XCircle, Edit } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  const { id: assignmentId } = await params;

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData) {
    redirect("/onboarding");
  }

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select(`
      *,
      assignment_classes(
        classes(name, subject)
      ),
      assignment_questions(*)
    `)
    .eq("id", assignmentId)
    .eq("teacher_id", userData.id)
    .single();

  if (!assignment) {
    redirect("/dashboard/teacher/assignments");
  }

  const { data: submissions } = await supabaseAdmin
    .from("assignment_submissions")
    .select(`
      *,
      users:student_id(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  const totalStudents = submissions?.length || 0;
  const submittedCount = submissions?.filter(
    (s) => s.status === "submitted" || s.status === "graded"
  ).length || 0;
  const pendingCount = totalStudents - submittedCount;
  const isPastDue = new Date(assignment.due_date) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        <Link href="/dashboard/teacher/assignments">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
              <p className="text-muted-foreground mb-4">
                {assignment.assignment_classes?.map((ac: any) => ac.classes?.name).filter(Boolean).join(", ") || "No classes"}
              </p>
              {assignment.description && (
                <p className="text-sm mb-4">{assignment.description}</p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isPastDue
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isPastDue ? "Past Due" : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {new Date(assignment.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Students</p>
                <p className="font-medium">{totalStudents}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">{submittedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="font-medium">{pendingCount}</p>
              </div>
            </div>
          </div>

          {/* Assignment Questions Summary */}
          {assignment.assignment_questions && assignment.assignment_questions.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    {assignment.assignment_questions.length} Questions
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Total Points: {assignment.total_points}
                  </p>
                </div>
                <Link href={`/dashboard/teacher/assignments/${assignmentId}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Questions
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Student Submissions</h2>

          {submissions && submissions.length > 0 ? (
            <div className="space-y-3">
              {submissions.map((submission: any) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {submission.users?.first_name} {submission.users?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {submission.users?.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {submission.status === "graded" && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {submission.score || 0} / {assignment.total_points}
                        </p>
                        <p className="text-xs text-muted-foreground">Graded</p>
                      </div>
                    )}

                    {submission.status === "submitted" && (
                      <span className="flex items-center gap-1 text-sm text-orange-600">
                        <Clock className="h-4 w-4" />
                        Needs Grading
                      </span>
                    )}

                    {submission.status === "draft" && (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <XCircle className="h-4 w-4" />
                        Not Started
                      </span>
                    )}

                    {(submission.status === "submitted" || submission.status === "graded") && (
                      <Link href={`/dashboard/teacher/assignments/${assignmentId}/grade/${submission.id}`}>
                        <Button size="sm" variant="outline">
                          {submission.status === "graded" ? "Review" : "Grade"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No students enrolled</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}