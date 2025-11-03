import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only students can join classes
    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Only students can join classes" },
        { status: 403 }
      );
    }

    // Find class by code
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select(
        `
        id,
        name,
        subject,
        teacher_id,
        users!classes_teacher_id_fkey(
          first_name,
          last_name
        )
      `
      )
      .eq("class_code", code)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: "Invalid class code or class not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const { data: existingMember } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", classData.id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already enrolled in this class" },
        { status: 400 }
      );
    }

    // Enroll student
    const { error: enrollError } = await supabaseAdmin
      .from("class_members")
      .insert({
        class_id: classData.id,
        user_id: user.id,
        role: "student",
      });

    if (enrollError) {
      console.error("Error enrolling student:", enrollError);
      return NextResponse.json(
        { error: "Failed to join class" },
        { status: 500 }
      );
    }

    // Create notification
    const teacher = Array.isArray(classData.users) ? classData.users[0] : classData.users;
    const teacherName = `${teacher.first_name} ${teacher.last_name}`;
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "class_enrollment",
        title: `Added to ${classData.name}`,
        message: `${teacherName} added you to their ${classData.subject || ""} class`,
        link: `/dashboard/student/live-classes`,
        is_read: false,
        priority: "normal",
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Successfully joined class",
      className: classData.name,
    });
  } catch (error) {
    console.error("Error in join class API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}