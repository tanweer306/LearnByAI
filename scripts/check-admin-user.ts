/**
 * Quick diagnostic script to check admin user in database
 * Usage: npx tsx scripts/check-admin-user.ts
 */

import { createClient } from "@supabase/supabase-js";

async function checkAdminUser() {
  console.log("=== Admin User Diagnostic ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if admin_users table exists
    const { data: tables, error: tablesError } = await supabase
      .from("admin_users")
      .select("*")
      .limit(1);

    if (tablesError) {
      console.error("❌ admin_users table doesn't exist or can't be accessed");
      console.error("Error:", tablesError.message);
      console.log("\n💡 Solution: Run the SQL to create admin_users table:");
      console.log(`
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  is_active boolean DEFAULT true,
  is_super_admin boolean DEFAULT false,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
      `);
      process.exit(1);
    }

    // List all admin users
    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("id, username, email, is_active, is_super_admin, created_at");

    if (adminsError) {
      console.error("❌ Error fetching admin users:", adminsError.message);
      process.exit(1);
    }

    if (!admins || admins.length === 0) {
      console.log("⚠️  No admin users found in database\n");
      console.log("💡 Create an admin user by running:");
      console.log("   npx tsx scripts/create-admin.ts\n");
      process.exit(0);
    }

    console.log(`✅ Found ${admins.length} admin user(s):\n`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Active: ${admin.is_active ? "✅ Yes" : "❌ No"}`);
      console.log(`   Super Admin: ${admin.is_super_admin ? "Yes" : "No"}`);
      console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log("");
    });

    console.log("📝 To test login with a specific user:");
    console.log("   npx tsx scripts/test-admin-login.ts\n");
    console.log("🔐 To reset a password:");
    console.log("   npx tsx scripts/reset-admin-password.ts\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAdminUser();
