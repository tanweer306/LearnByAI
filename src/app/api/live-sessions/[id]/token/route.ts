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

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role, first_name, last_name")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("live_class_sessions")
      .select("id, class_id, status, meeting_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (user.role === "student") {
      const { data: enrollment } = await supabaseAdmin
        .from("class_members")
        .select("id")
        .eq("class_id", session.class_id)
        .eq("user_id", user.id)
        .single();

      if (!enrollment) {
        return NextResponse.json(
          { error: "Not enrolled in this class" },
          { status: 403 }
        );
      }
    } else if (user.role === "teacher") {
      const { data: classData } = await supabaseAdmin
        .from("classes")
        .select("teacher_id")
        .eq("id", session.class_id)
        .single();

      if (classData?.teacher_id !== user.id) {
        return NextResponse.json(
          { error: "Not your class" },
          { status: 403 }
        );
      }
    }

    // Generate Daily.co meeting token
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json(
        { error: "Daily.co not configured" },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      "https://api.daily.co/v1/meeting-tokens",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            room_name: session.meeting_id,
            user_name: `${user.first_name} ${user.last_name}`,
            is_owner: user.role === "teacher",
            enable_recording: user.role === "teacher" ? "cloud" : false,
          },
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error("Daily.co token error:", await tokenResponse.text());
      return NextResponse.json(
        { error: "Failed to generate meeting token" },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      token: tokenData.token,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}