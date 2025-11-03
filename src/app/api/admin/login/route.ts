import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, createAdminSession } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { usernameOrEmail, password } = await request.json();

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Username/email and password are required" },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin(usernameOrEmail, password);

    if (!result.success || !result.admin) {
      return NextResponse.json(
        { success: false, error: result.error || "Authentication failed" },
        { status: 401 }
      );
    }

    // Create session
    await createAdminSession(result.admin);

    return NextResponse.json({
      success: true,
      admin: {
        username: result.admin.username,
        email: result.admin.email,
        full_name: result.admin.full_name,
        is_super_admin: result.admin.is_super_admin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
