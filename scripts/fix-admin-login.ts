/**
 * Complete Admin Login Fix Script
 * This will check for admin users and create one if needed
 * Usage: npx tsx scripts/fix-admin-login.ts
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

async function fixAdminLogin() {
  console.log("=== Admin Login Fix Script ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check if admin_users table exists
    console.log("Step 1: Checking admin_users table...");
    const { data: tableCheck, error: tableError } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);

    if (tableError && tableError.code === "42P01") {
      console.log("❌ admin_users table doesn't exist!");
      console.log("\n📝 Creating admin_users table...\n");

      const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);
      `;

      console.log("Please run this SQL in your Supabase SQL Editor:");
      console.log("=====================================");
      console.log(createTableSQL);
      console.log("=====================================\n");
      console.log("After running the SQL, run this script again.");
      process.exit(0);
    }

    // Step 2: Check for existing admin users
    console.log("✅ admin_users table exists\n");
    console.log("Step 2: Checking for admin users...");

    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("*");

    if (adminsError) {
      console.error("❌ Error fetching admin users:", adminsError.message);
      process.exit(1);
    }

    if (admins && admins.length > 0) {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Active: ${admin.is_active ? "✅ Yes" : "❌ No"}`);
        console.log(`   Super Admin: ${admin.is_super_admin ? "Yes" : "No"}`);
        console.log("");
      });

      const choice = await question(
        "What would you like to do?\n1. Test login with existing admin\n2. Reset password for existing admin\n3. Create new admin\n4. Exit\n\nChoice (1-4): "
      );

      if (choice === "1") {
        // Test login
        const username = await question("\nEnter username or email: ");
        const password = await question("Enter password: ");

        console.log("\n🔍 Testing credentials...");

        const admin = admins.find(
          (a) => a.username === username || a.email === username
        );

        if (!admin) {
          console.log("❌ User not found!");
          rl.close();
          return;
        }

        if (!admin.is_active) {
          console.log("❌ Account is deactivated!");
          rl.close();
          return;
        }

        const isValid = await bcrypt.compare(password, admin.password);
        if (isValid) {
          console.log("✅ Credentials are VALID! Login should work.");
          console.log("\nTry logging in at: http://localhost:3000/admin-portal/login");
        } else {
          console.log("❌ Password is INCORRECT!");
          console.log("\nRun this script again and choose option 2 to reset password.");
        }
      } else if (choice === "2") {
        // Reset password
        const username = await question("\nEnter username to reset password: ");
        const newPassword = await question("Enter new password: ");

        const admin = admins.find((a) => a.username === username);

        if (!admin) {
          console.log("❌ User not found!");
          rl.close();
          return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
          .from("admin_users")
          .update({ password: hashedPassword })
          .eq("id", admin.id);

        if (updateError) {
          console.log("❌ Error updating password:", updateError.message);
        } else {
          console.log("✅ Password reset successfully!");
          console.log(`\nYou can now login with:`);
          console.log(`Username: ${admin.username}`);
          console.log(`Password: ${newPassword}`);
        }
      } else if (choice === "3") {
        // Create new admin - continue to creation flow
      } else {
        console.log("Exiting...");
        rl.close();
        return;
      }
    }

    // Step 3: Create new admin if needed
    if (!admins || admins.length === 0 || (await question("")) === "3") {
      console.log("\n📝 Creating new admin user...\n");

      const username = await question("Enter username (default: admin): ") || "admin";
      const email = await question("Enter email (default: admin@example.com): ") || "admin@example.com";
      const password = await question("Enter password (default: Admin@123): ") || "Admin@123";
      const fullName = await question("Enter full name (optional): ") || "System Administrator";

      console.log("\n🔐 Hashing password...");
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log("💾 Creating admin user...");
      const { data: newAdmin, error: createError } = await supabase
        .from("admin_users")
        .insert({
          username,
          email,
          password: hashedPassword,
          full_name: fullName,
          is_active: true,
          is_super_admin: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating admin:", createError.message);
        if (createError.code === "23505") {
          console.log("\n💡 Username or email already exists. Try a different one.");
        }
        process.exit(1);
      }

      console.log("\n✅ Admin user created successfully!\n");
      console.log("Login credentials:");
      console.log("==================");
      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log("==================\n");
      console.log("🌐 Login at: http://localhost:3000/admin-portal/login\n");
    }

    rl.close();
  } catch (error) {
    console.error("❌ Error:", error);
    rl.close();
    process.exit(1);
  }
}

fixAdminLogin();
