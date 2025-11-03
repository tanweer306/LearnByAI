import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n🔐 Admin Password Hash Generator\n");
  console.log("This script will hash your admin password properly.\n");

  // Get username
  const username = await question("Enter admin username (or email): ");

  if (!username.trim()) {
    console.error("❌ Username cannot be empty");
    rl.close();
    return;
  }

  // Check if admin exists
  const { data: admin, error: fetchError } = await supabase
    .from("admin_users")
    .select("*")
    .or(`username.eq.${username},email.eq.${username}`)
    .single();

  if (fetchError || !admin) {
    console.error(`❌ Admin user '${username}' not found`);
    rl.close();
    return;
  }

  console.log(`\n✅ Found admin: ${admin.username} (${admin.email})`);
  console.log(`   Current password in DB: ${admin.password.substring(0, 20)}...`);

  // Check if already hashed
  if (admin.password.startsWith("$2a$") || admin.password.startsWith("$2b$")) {
    console.log("\n⚠️  Password appears to already be hashed (starts with $2a$ or $2b$)");
    const rehash = await question("Do you want to rehash it anyway? (yes/no): ");
    if (rehash.toLowerCase() !== "yes") {
      console.log("Cancelled.");
      rl.close();
      return;
    }
  }

  // Get new password
  const newPassword = await question("\nEnter NEW password: ");

  if (!newPassword.trim() || newPassword.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    rl.close();
    return;
  }

  // Hash the password
  console.log("\n🔄 Hashing password...");
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log(`\n✅ Hashed password: ${hashedPassword.substring(0, 30)}...`);

  // Update in database
  const { error: updateError } = await supabase
    .from("admin_users")
    .update({
      password: hashedPassword,
      updated_at: new Date().toISOString(),
    })
    .eq("id", admin.id);

  if (updateError) {
    console.error("\n❌ Failed to update password:", updateError);
    rl.close();
    return;
  }

  console.log("\n✅ Password updated successfully!");
  console.log("\n📋 Login credentials:");
  console.log(`   Username: ${admin.username}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: ${newPassword}`);
  console.log("\n🔐 You can now login at /admin-portal/login");

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
