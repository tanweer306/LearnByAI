import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, Calendar, Users } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

export default async function TeacherAssignmentsPage() {
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

  // Fetch assignments with class info and submission counts
  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select(`
      *,
      assignment_classes(
        classes(name)
      )
    `)
    .eq("teacher_id", userData.id)
    .order("created_at", { ascending: false });

  // Get submission counts for each assignment
  const assignmentsWithCounts = await Promise.all(
    (assignments || []).map(async (assignment) => {
      const { count } = await supabaseAdmin
        .from("assignment_submissions")
        .select("*", { count: 'exact', head: true })
        .eq("assignment_id", assignment.id);

      const { count: submittedCount } = await supabaseAdmin
        .from("assignment_submissions")
        .select("*", { count: 'exact', head: true })
        .eq("assignment_id", assignment.id)
        .in("status", ["submitted", "graded"]);

      return {
        ...assignment,
        totalSubmissions: count || 0,
        submittedCount: submittedCount || 0,
      };
    })
  );

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assignments</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track student assignments
            </p>
          </div>
          <Link href="/dashboard/teacher/assignments/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Assignment
            </Button>
          </Link>
        </div>

        {/* Assignments List */}
        {assignmentsWithCounts && assignmentsWithCounts.length > 0 ? (
          <div className="space-y-4">
            {assignmentsWithCounts.map((assignment: any) => (
              <Link
                key={assignment.id}
                href={`/dashboard/teacher/assignments/${assignment.id}`}
              >
                <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-[#99CE79] p-2 rounded-lg">
                          <ClipboardList className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">
                            {assignment.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {assignment.assignment_classes?.length > 0
                              ? assignment.assignment_classes.map((ac: any) => ac.classes?.name).filter(Boolean).join(", ")
                              : "No classes assigned"}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {assignment.description || "No description"}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Due:{" "}
                            {assignment.due_date
                              ? new Date(assignment.due_date).toLocaleDateString()
                              : "No due date"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>
                            {assignment.submittedCount || 0} / {assignment.totalSubmissions || 0} submitted
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          assignment.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {assignment.status || "draft"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first assignment for your students
            </p>
            <Link href="/dashboard/teacher/assignments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Assignment
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
