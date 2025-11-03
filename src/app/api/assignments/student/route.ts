import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { data: submissions } = await supabaseAdmin
      .from("assignment_submissions")
      .select(`
        *,
        assignments(
          *,
          assignment_classes(
            classes(name, subject)
          )
        )
      `)
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}