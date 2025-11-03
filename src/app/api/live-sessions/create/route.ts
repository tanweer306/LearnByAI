import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      classId,
      title,
      description,
      scheduledStart,
      scheduledEnd,
      meetingPlatform = "daily",
      meetingLink,
      accessCode,
      maxParticipants = 50,
    } = body;

    // Validation
    if (!classId || !title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Get teacher's user ID from Supabase
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    if (teacher.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create live sessions" },
        { status: 403 }
      );
    }

    // Verify teacher is assigned to this class
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, teacher_id, name")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (classData.teacher_id !== teacher.id) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
        { status: 403 }
      );
    }

    // Generate Daily.co room if using Daily
    let finalMeetingLink = meetingLink;
    let meetingId = null;

    if (meetingPlatform === "daily" && !meetingLink) {
      // Create Daily.co room
      const dailyApiKey = process.env.DAILY_API_KEY;

      if (!dailyApiKey) {
        return NextResponse.json(
          { error: "Daily.co API key not configured" },
          { status: 500 }
        );
      }

      try {
        const roomName = `class-${classId}-${Date.now()}`;
        const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: roomName,
            privacy: "public",
            properties: {
              max_participants: maxParticipants,
              enable_chat: true,
              enable_screenshare: true,
              enable_recording: "cloud",
              start_video_off: false,
              start_audio_off: false,
            },
          }),
        });

        if (!dailyResponse.ok) {
          console.error("Daily.co API error:", await dailyResponse.text());
          return NextResponse.json(
            { error: "Failed to create meeting room" },
            { status: 500 }
          );
        }

        const dailyRoom = await dailyResponse.json();
        finalMeetingLink = dailyRoom.url;
        meetingId = dailyRoom.name;
      } catch (error) {
        console.error("Error creating Daily.co room:", error);
        return NextResponse.json(
          { error: "Failed to create meeting room" },
          { status: 500 }
        );
      }
    }

    // Create live session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("live_class_sessions")
      .insert({
        class_id: classId,
        teacher_id: teacher.id,
        title,
        description: description || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        meeting_platform: meetingPlatform,
        meeting_link: finalMeetingLink,
        meeting_id: meetingId,
        access_code: accessCode || null,
        max_participants: maxParticipants,
        status: "scheduled",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Get all students enrolled in the class
    const { data: students, error: studentsError } = await supabaseAdmin
      .from("class_members")
      .select("user_id, users!inner(id, email, first_name, last_name)")
      .eq("class_id", classId)
      .eq("role", "student");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
    }

    // Create attendance records for all students (initially absent)
    if (students && students.length > 0) {
      const attendanceRecords = students.map((student: any) => ({
        session_id: session.id,
        student_id: student.users.id,
        status: "absent",
      }));

      const { error: attendanceError } = await supabaseAdmin
        .from("class_session_attendance")
        .insert(attendanceRecords);

      if (attendanceError) {
        console.error("Error creating attendance records:", attendanceError);
      }
    }

    // Create notifications for students
    if (students && students.length > 0) {
      const notifications = students.map((student: any) => ({
        user_id: student.users.id,
        type: "live_session_scheduled",
        title: "New Live Session Scheduled",
        message: `${title} has been scheduled for ${new Date(scheduledStart).toLocaleString()}`,
        link: `/dashboard/student/live-classes`,
        priority: "high",
      }));

      const { error: notificationError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Error creating notifications:", notificationError);
      }
    }

    // TODO: Send email notifications to students

    return NextResponse.json({
      success: true,
      session,
      message: "Live session created successfully",
    });
  } catch (error) {
    console.error("Error in create live session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
