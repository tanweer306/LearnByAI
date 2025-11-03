/**
 * Script to create an admin user in the database
 * Usage: npx tsx scripts/create-admin.ts
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

async function createAdmin() {
  console.log("=== Create Admin User ===\n");

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing Supabase credentials in environment variables");
    console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get admin details from user
    const username = await question("Enter username: ");
    const email = await question("Enter email: ");
    const password = await question("Enter password: ");
    const fullName = await question("Enter full name (optional): ");
    const isSuperAdmin = (await question("Is super admin? (y/n): ")).toLowerCase() === "y";

    if (!username || !email || !password) {
      console.error("Error: Username, email, and password are required");
      process.exit(1);
    }

    // Hash password
    console.log("\nHashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    console.log("Creating admin user...");
    const { data, error } = await supabase.from("admin_users").insert({
      username,
      email,
      password: hashedPassword,
      full_name: fullName || null,
      is_super_admin: isSuperAdmin,
      is_active: true,
    }).select().single();

    if (error) {
      console.error("Error creating admin user:", error.message);
      process.exit(1);
    }

    console.log("\n✅ Admin user created successfully!");
    console.log("\nAdmin Details:");
    console.log(`- Username: ${data.username}`);
    console.log(`- Email: ${data.email}`);
    console.log(`- Full Name: ${data.full_name || "N/A"}`);
    console.log(`- Super Admin: ${data.is_super_admin ? "Yes" : "No"}`);
    console.log(`- Status: ${data.is_active ? "Active" : "Inactive"}`);
    console.log("\nYou can now login at: /admin-portal/login");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdmin();
