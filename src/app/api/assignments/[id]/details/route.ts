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

    const { data: teacher } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        assignment_questions(*)
      `)
      .eq("id", assignmentId)
      .eq("teacher_id", teacher.id)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Error fetching assignment details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}