import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classId, memberId } = await params;

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

    // Remove member
    const { error: deleteError } = await supabaseAdmin
      .from("class_members")
      .delete()
      .eq("id", memberId)
      .eq("class_id", classId);

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error in remove member API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}