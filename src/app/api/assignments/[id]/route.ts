import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: assignmentId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
      .single();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Get or create submission for student
    let { data: submission } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    // If no submission exists, create one
    if (!submission) {
      const { data: newSubmission } = await supabaseAdmin
        .from("assignment_submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          status: "draft",
          total_points: assignment.total_points,
        })
        .select()
        .single();
      
      submission = newSubmission;
    }

    return NextResponse.json({
      success: true,
      assignment,
      submission,
    });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}