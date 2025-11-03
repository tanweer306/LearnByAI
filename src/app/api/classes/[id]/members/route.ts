import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classId } = await params;

    // Get teacher's user ID
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify teacher owns this class
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .eq("teacher_id", teacher.id)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: "Class not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get all members
    const { data: members, error: membersError } = await supabaseAdmin
      .from("class_members")
      .select(
        `
        id,
        user_id,
        role,
        joined_at,
        users!inner(
          id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq("class_id", classId)
      .order("joined_at", { ascending: false });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      members: members || [],
    });
  } catch (error) {
    console.error("Error in get members API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}