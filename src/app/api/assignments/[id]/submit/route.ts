import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: assignmentId } = await params;
    const { answers } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("assignment_submissions")
      .update({
        answers: JSON.stringify(answers),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("assignment_id", assignmentId)
      .eq("student_id", student.id);

    if (error) {
      console.error("Error submitting assignment:", error);
      return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Assignment submitted successfully",
    });
  } catch (error) {
    console.error("Error in assignment submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}