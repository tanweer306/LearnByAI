import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, subject, grade_level, start_date, end_date, schedule_time, schedule_days } = body;

    if (!name || !subject) {
      return NextResponse.json(
        { error: "Class name and subject are required" },
        { status: 400 }
      );
    }

    // Get teacher's user ID from Supabase
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id, role, institution_id")
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
        { error: "Only teachers can create classes" },
        { status: 403 }
      );
    }

    // Generate unique class code
    const classCode = nanoid(8).toUpperCase();

    // Prepare class data - convert empty strings to null for date/time fields
    const classData: any = {
      teacher_id: teacher.id,
      name,
      description: description || null,
      subject,
      grade_level: grade_level || null,
      class_code: classCode,
      start_date: start_date || null,
      end_date: end_date || null,
      schedule_time: schedule_time || null,
      schedule_days: schedule_days && schedule_days.length > 0 ? schedule_days : null,
      institution_id: teacher.institution_id,
    };

    // Create class
    const { data: newClass, error: classError } = await supabaseAdmin
      .from("classes")
      .insert(classData)
      .select()
      .single();

    if (classError) {
      console.error("Error creating class:", classError);
      return NextResponse.json(
        { error: "Failed to create class" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      message: "Class created successfully",
    });
  } catch (error) {
    console.error("Error in create class API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
