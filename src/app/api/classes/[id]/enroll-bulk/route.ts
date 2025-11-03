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

    const { id: classId } = await params;
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Email list is required" },
        { status: 400 }
      );
    }

    // Get teacher's user ID
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (teacherError || !teacher || teacher.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can enroll students" },
        { status: 403 }
      );
    }

    // Verify teacher owns this class
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("teacher_id")
      .eq("id", classId)
      .single();

    if (classError || !classData || classData.teacher_id !== teacher.id) {
      return NextResponse.json(
        { error: "Class not found or unauthorized" },
        { status: 404 }
      );
    }

    // Find students by email
    const { data: students, error: studentsError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .in("email", emails);

    if (studentsError) {
      return NextResponse.json(
        { error: "Error finding students" },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "No students found with provided emails" },
        { status: 404 }
      );
    }

    // Enroll students in class
    const enrollments = students.map((student) => ({
      class_id: classId,
      user_id: student.id,
      role: "student",
    }));

    const { error: enrollError } = await supabaseAdmin
      .from("class_members")
      .upsert(enrollments, { onConflict: "class_id,user_id" });

    if (enrollError) {
      console.error("Error enrolling students:", enrollError);
      return NextResponse.json(
        { error: "Failed to enroll students" },
        { status: 500 }
      );
    }

    // Get class details for notifications
    const { data: classDetails } = await supabaseAdmin
      .from("classes")
      .select(
        `
        name,
        subject,
        users!classes_teacher_id_fkey(
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("id", classId)
      .single();

    // Create notifications for enrolled students
    if (classDetails && students.length > 0) {
      const users = Array.isArray(classDetails.users)
        ? (classDetails.users as any[])
        : [(classDetails.users as any)];

      const teacherRecord = users.find((user) => user?.id === teacher.id) ?? users[0];

      const teacherName = teacherRecord
        ? `${teacherRecord?.first_name ?? ""} ${teacherRecord?.last_name ?? ""}`.trim() || "Your teacher"
        : "Your teacher";

      const notifications = students.map((student) => ({
        user_id: student.id,
        type: "class_enrollment",
        title: `Added to ${classDetails.name}`,
        message: `${teacherName} added you to their ${classDetails.subject || ""} class`,
        link: `/dashboard/student/live-classes`,
        is_read: false,
        priority: "normal",
      }));

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating enrollment notifications:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      enrolled: students.length,
      message: `Successfully enrolled ${students.length} student(s)`,
    });
  } catch (error) {
    console.error("Error in bulk enrollment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
