import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";
import GradingInterface from "@/components/assignments/GradingInterface";

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { userId } = await auth();
  const { id: assignmentId, submissionId } = await params;

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

  // Fetch submission with assignment and questions
  const { data: submission } = await supabaseAdmin
    .from("assignment_submissions")
    .select(`
      *,
      student:users!student_id(first_name, last_name, email),
      assignment:assignments(
        *,
        assignment_questions(*)
      )
    `)
    .eq("id", submissionId)
    .single();

  if (!submission || submission.assignment.teacher_id !== userData.id) {
    redirect("/dashboard/teacher/assignments");
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />
      <GradingInterface submission={submission} assignmentId={assignmentId} />
    </div>
  );
}