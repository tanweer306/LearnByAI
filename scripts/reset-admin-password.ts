/**
 * Script to reset admin password
 * Usage: npx tsx scripts/reset-admin-password.ts
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

async function resetAdminPassword() {
  console.log("=== Reset Admin Password ===\n");

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
    const newPassword = await question("Enter new password: ");
    const confirmPassword = await question("Confirm new password: ");

    if (newPassword !== confirmPassword) {
      console.error("❌ Passwords do not match");
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error("❌ Password must be at least 6 characters long");
      process.exit(1);
    }

    console.log("\n🔍 Looking up admin user...");

    // Find admin by username or email
    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .single();

    if (error || !admin) {
      console.error("❌ Admin user not found");
      process.exit(1);
    }

    console.log("✅ Admin user found!");
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - Email: ${admin.email}`);

    console.log("\n🔐 Hashing new password...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("💾 Updating password in database...");
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", admin.id);

    if (updateError) {
      console.error("❌ Failed to update password:", updateError.message);
      process.exit(1);
    }

    console.log("\n✅ Password reset successful!");
    console.log("\nYou can now login at: http://localhost:3000/admin-portal/login");
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - New Password: (the one you just set)`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

resetAdminPassword();
