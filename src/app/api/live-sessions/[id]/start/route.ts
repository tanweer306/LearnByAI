import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Get teacher's user ID
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // Get session and verify teacher owns it
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("live_class_sessions")
      .select("*, classes!inner(name)")
      .eq("id", sessionId)
      .eq("teacher_id", teacher.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 404 }
      );
    }

    if (session.status === "live") {
      return NextResponse.json(
        { error: "Session is already live" },
        { status: 400 }
      );
    }

    if (session.status === "ended" || session.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot start an ended or cancelled session" },
        { status: 400 }
      );
    }

    // Update session status to live
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("live_class_sessions")
      .update({
        status: "live",
        actual_start: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error starting session:", updateError);
      return NextResponse.json(
        { error: "Failed to start session" },
        { status: 500 }
      );
    }

    // Get all students in the class
    const { data: students, error: studentsError } = await supabaseAdmin
      .from("class_members")
      .select("user_id, users!inner(id, email, first_name, last_name, clerk_user_id)")
      .eq("class_id", session.class_id)
      .eq("role", "student");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
    }

    // TODO: Send email notifications to all students
    // TODO: Create high-priority dashboard notifications

    // For now, create notifications in database
    if (students && students.length > 0) {
      const notifications = students.map((student: any) => ({
        user_id: student.users.id,
        type: "live_class_started",
        title: `🔴 LIVE: ${session.title}`,
        message: `${session.classes.name} is now live! Click to join the class.`,
        link: `/dashboard/student/live-classes/${sessionId}`,
        is_read: false,
        priority: "high",
      }));

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: "Session started successfully",
      studentsNotified: students?.length || 0,
    });
  } catch (error) {
    console.error("Error in start session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
