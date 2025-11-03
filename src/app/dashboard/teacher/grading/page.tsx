import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, FileText, Users } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";
import Link from "next/link";

export default async function TeacherGradingPage() {
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

  // TODO: Fetch submissions that need grading
  const pendingSubmissions: any[] = [];

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Grading</h1>
          <p className="text-muted-foreground mt-1">
            Review and grade student submissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 dark:bg-yellow-950 p-3 rounded-lg">
                <ClipboardCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">0</h3>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">0</h3>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">0</h3>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {pendingSubmissions.length > 0 ? (
          <div className="space-y-4">
            {pendingSubmissions.map((submission: any) => (
              <div
                key={submission.id}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {submission.assignment_title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted by {submission.student_name}
                    </p>
                  </div>
                  <Button>Grade</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No submissions to grade</h3>
            <p className="text-muted-foreground mb-6">
              Student submissions will appear here when they submit assignments
            </p>
            <Link href="/dashboard/teacher/assignments">
              <Button variant="outline">View Assignments</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
