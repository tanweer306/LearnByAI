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

    // Get session with class and teacher details
    const { data: session, error: sessionError } = await supabaseAdmin
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
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this session
    if (user.role === "teacher" && session.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (user.role === "student") {
      // Check if student is enrolled in the class
      const { data: enrollment } = await supabaseAdmin
        .from("class_members")
        .select("id")
        .eq("class_id", session.class_id)
        .eq("user_id", user.id)
        .single();

      if (!enrollment) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error in get session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
