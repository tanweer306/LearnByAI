import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Get user's ID from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get session to verify access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("live_class_sessions")
      .select("id, teacher_id, class_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user has access
    if (user.role === "teacher" && session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get attendance records
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from("class_session_attendance")
      .select(`
        *,
        users!class_session_attendance_student_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError);
      return NextResponse.json(
        { error: "Failed to fetch attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance: attendance || [],
    });
  } catch (error) {
    console.error("Error in attendance API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
