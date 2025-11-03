import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'scheduled', 'live', 'ended', 'all'
    const classId = searchParams.get("classId");

    // Get user's ID from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let query = supabaseAdmin
      .from("live_class_sessions")
      .select(`
        *,
        classes!inner(
          id,
          name,
          subject,
          grade_level
        ),
        users!live_class_sessions_teacher_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `);

    // Filter by user role
    if (user.role === "teacher") {
      query = query.eq("teacher_id", user.id);
    } else if (user.role === "student") {
      // Get classes where student is enrolled
      const { data: enrolledClasses } = await supabaseAdmin
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .eq("role", "student");

      const classIds = enrolledClasses?.map((c) => c.class_id) || [];

      if (classIds.length === 0) {
        return NextResponse.json({ success: true, sessions: [] });
      }

      query = query.in("class_id", classIds);
    }

    // Filter by status
    if (status && status !== "all") {
      if (status === "upcoming") {
        query = query.in("status", ["scheduled", "live"]);
      } else {
        query = query.eq("status", status);
      }
    }

    // Filter by class
    if (classId) {
      query = query.eq("class_id", classId);
    }

    // Order by scheduled start
    query = query.order("scheduled_start", { ascending: true });

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // For each session, get attendance count if user is teacher
    if (user.role === "teacher" && sessions) {
      const sessionsWithAttendance = await Promise.all(
        sessions.map(async (session) => {
          const { data: attendance } = await supabaseAdmin
            .from("class_session_attendance")
            .select("status")
            .eq("session_id", session.id);

          return {
            ...session,
            attendance_summary: {
              total: attendance?.length || 0,
              present:
                attendance?.filter((a) => a.status === "present").length || 0,
              absent:
                attendance?.filter((a) => a.status === "absent").length || 0,
            },
          };
        })
      );

      return NextResponse.json({
        success: true,
        sessions: sessionsWithAttendance,
      });
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
    });
  } catch (error) {
    console.error("Error in list sessions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
