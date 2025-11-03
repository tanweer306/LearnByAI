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

    // Get user's ID from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("live_class_sessions")
      .select("id, class_id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if session is live
    if (session.status !== "live") {
      return NextResponse.json(
        { error: "Session is not currently live" },
        { status: 400 }
      );
    }

    // For students, verify they're enrolled in the class
    if (user.role === "student") {
      const { data: enrollment } = await supabaseAdmin
        .from("class_members")
        .select("id")
        .eq("class_id", session.class_id)
        .eq("user_id", user.id)
        .single();

      if (!enrollment) {
        return NextResponse.json(
          { error: "You are not enrolled in this class" },
          { status: 403 }
        );
      }
    }

    // Update or create attendance record
    const { data: existingAttendance } = await supabaseAdmin
      .from("class_session_attendance")
      .select("id, status")
      .eq("session_id", sessionId)
      .eq("student_id", user.id)
      .single();

    if (existingAttendance) {
      // Update existing record
      await supabaseAdmin
        .from("class_session_attendance")
        .update({
          status: "present",
          joined_at: new Date().toISOString(),
        })
        .eq("id", existingAttendance.id);
    } else {
      // Create new attendance record
      await supabaseAdmin.from("class_session_attendance").insert({
        session_id: sessionId,
        student_id: user.id,
        status: "present",
        joined_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Joined session successfully",
    });
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}