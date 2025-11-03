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
    const body = await request.json();
    const {
      classMinutes,
      topicsCovered,
      homeworkAssigned,
      homeworkDueDate,
    } = body;

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

    if (session.status !== "live") {
      return NextResponse.json(
        { error: "Session is not currently live" },
        { status: 400 }
      );
    }

    // Update session status to ended
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("live_class_sessions")
      .update({
        status: "ended",
        actual_end: new Date().toISOString(),
        class_minutes: classMinutes || null,
        topics_covered: topicsCovered || null,
        homework_assigned: homeworkAssigned || null,
        homework_due_date: homeworkDueDate || null,
        added_minutes_by: teacher.id,
        added_minutes_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error ending session:", updateError);
      return NextResponse.json(
        { error: "Failed to end session" },
        { status: 500 }
      );
    }

    console.log("Session ended successfully:", {
      sessionId,
      status: "ended",
      actual_end: updatedSession.actual_end
    });

    // Delete Daily.co room to prevent ongoing costs
    if (session.meeting_id) {
      const dailyApiKey = process.env.DAILY_API_KEY;
      if (dailyApiKey) {
        try {
          const deleteResponse = await fetch(
            `https://api.daily.co/v1/rooms/${session.meeting_id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${dailyApiKey}`,
              },
            }
          );

          if (deleteResponse.ok) {
            console.log("Daily.co room deleted:", session.meeting_id);
          } else {
            console.error(
              "Failed to delete Daily.co room:",
              await deleteResponse.text()
            );
          }
        } catch (error) {
          console.error("Error deleting Daily.co room:", error);
        }
      }
    }

    // Get attendance summary
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from("class_session_attendance")
      .select("status")
      .eq("session_id", sessionId);

    const attendanceSummary = {
      total: attendance?.length || 0,
      present: attendance?.filter((a) => a.status === "present").length || 0,
      absent: attendance?.filter((a) => a.status === "absent").length || 0,
      late: attendance?.filter((a) => a.status === "late").length || 0,
    };

    // Get all students in the class for notifications
    const { data: students, error: studentsError } = await supabaseAdmin
      .from("class_members")
      .select("user_id, users!inner(id, email, first_name, last_name)")
      .eq("class_id", session.class_id)
      .eq("role", "student");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
    }

    // TODO: Send email with class summary to all students
    // TODO: Create notifications with class materials link

    // Create notifications
    if (students && students.length > 0) {
      const notifications = students.map((student: any) => ({
        user_id: student.users.id,
        type: "class_ended",
        title: `Class Ended: ${session.title}`,
        message: `${session.classes.name} has ended. ${
          homeworkAssigned ? "Homework has been assigned." : "Check class materials."
        }`,
        link: `/dashboard/student/live-classes/${sessionId}`,
        is_read: false,
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
      attendanceSummary,
      message: "Session ended successfully",
    });
  } catch (error) {
    console.error("Error in end session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
