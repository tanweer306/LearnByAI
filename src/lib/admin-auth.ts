import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import bcrypt from "bcryptjs";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  is_super_admin: boolean;
  is_active: boolean;
}

export interface AdminSession {
  adminId: string;
  username: string;
  email: string;
  is_super_admin: boolean;
  expiresAt: number;
}

/**
 * Authenticate admin user with username/email and password
 */
export async function authenticateAdmin(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  try {
    // Find admin by username or email
    const { data: admin, error } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .single();

    if (error || !admin) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check if admin is active
    if (!admin.is_active) {
      return { success: false, error: "Account is deactivated" };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    // Update last login
    await supabaseAdmin
      .from("admin_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", admin.id);

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        is_super_admin: admin.is_super_admin,
        is_active: admin.is_active,
      },
    };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Create admin session
 */
export async function createAdminSession(admin: AdminUser): Promise<void> {
  const session: AdminSession = {
    adminId: admin.id,
    username: admin.username,
    email: admin.email,
    is_super_admin: admin.is_super_admin,
    expiresAt: Date.now() + SESSION_DURATION,
  };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

/**
 * Get current admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);

    if (!sessionCookie) {
      return null;
    }

    const session: AdminSession = JSON.parse(sessionCookie.value);

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      await destroyAdminSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Error getting admin session:", error);
    return null;
  }
}

/**
 * Verify admin session and get admin data
 */
export async function verifyAdminSession(): Promise<{
  isValid: boolean;
  admin?: AdminUser;
}> {
  const session = await getAdminSession();

  if (!session) {
    return { isValid: false };
  }

  try {
    // Verify admin still exists and is active
    const { data: admin, error } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("id", session.adminId)
      .single();

    if (error || !admin || !admin.is_active) {
      await destroyAdminSession();
      return { isValid: false };
    }

    return {
      isValid: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        is_super_admin: admin.is_super_admin,
        is_active: admin.is_active,
      },
    };
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return { isValid: false };
  }
}

/**
 * Destroy admin session (logout)
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Hash password for creating new admin users
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
