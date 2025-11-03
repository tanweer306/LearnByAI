/**
 * Script to test admin login credentials
 * Usage: npx tsx scripts/test-admin-login.ts
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function testAdminLogin() {
  console.log("=== Test Admin Login ===\n");

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing Supabase credentials in environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const usernameOrEmail = await question("Enter username or email: ");
    const password = await question("Enter password: ");

    console.log("\n🔍 Looking up admin user...");

    // Find admin by username or email
    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .single();

    if (error || !admin) {
      console.error("❌ Admin user not found");
      console.error("Error:", error?.message);
      
      // List all admin users
      console.log("\n📋 Available admin users:");
      const { data: allAdmins } = await supabase
        .from("admin_users")
        .select("username, email, is_active");
      
      if (allAdmins && allAdmins.length > 0) {
        allAdmins.forEach((a) => {
          console.log(`  - Username: ${a.username}, Email: ${a.email}, Active: ${a.is_active}`);
        });
      } else {
        console.log("  No admin users found in database");
      }
      
      process.exit(1);
    }

    console.log("✅ Admin user found!");
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - Email: ${admin.email}`);
    console.log(`  - Active: ${admin.is_active}`);
    console.log(`  - Super Admin: ${admin.is_super_admin}`);

    if (!admin.is_active) {
      console.error("\n❌ Account is deactivated");
      process.exit(1);
    }

    console.log("\n🔐 Verifying password...");

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (isValidPassword) {
      console.log("✅ Password is correct!");
      console.log("\n🎉 Login test successful!");
      console.log("\nYou can now login at: http://localhost:3000/admin-portal/login");
    } else {
      console.error("❌ Password is incorrect");
      console.log("\n💡 Tip: If you forgot your password, you can reset it by:");
      console.log("   1. Running: npx tsx scripts/reset-admin-password.ts");
      console.log("   2. Or updating directly in Supabase with a new bcrypt hash");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

testAdminLogin();
