import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total users count
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });

    // Get students count
    const { count: totalStudents } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    // Get teachers count
    const { count: totalTeachers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    // Get institutions count
    const { count: totalInstitutions } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "institute");

    // Get total books count
    const { count: totalBooks } = await supabaseAdmin
      .from("books")
      .select("*", { count: "exact", head: true });

    // Get active subscriptions count
    const { count: activeSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get new users this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      totalInstitutions: totalInstitutions || 0,
      totalBooks: totalBooks || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalRevenue: 0, // TODO: Calculate from subscriptions
      newUsersThisMonth: newUsersThisMonth || 0,
    });
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
