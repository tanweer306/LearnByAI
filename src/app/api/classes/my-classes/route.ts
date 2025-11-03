import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's ID from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let classes;

    if (user.role === "teacher") {
      // Get classes where user is the teacher
      const { data, error } = await supabaseAdmin
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching teacher classes:", error);
        return NextResponse.json(
          { error: "Failed to fetch classes" },
          { status: 500 }
        );
      }

      classes = data;
    } else if (user.role === "student") {
      // Get classes where user is enrolled
      const { data, error } = await supabaseAdmin
        .from("class_members")
        .select("classes(*)")
        .eq("user_id", user.id)
        .eq("role", "student");

      if (error) {
        console.error("Error fetching student classes:", error);
        return NextResponse.json(
          { error: "Failed to fetch classes" },
          { status: 500 }
        );
      }

      classes = data?.map((item: any) => item.classes) || [];
    } else {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      classes: classes || [],
    });
  } catch (error) {
    console.error("Error in my-classes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
