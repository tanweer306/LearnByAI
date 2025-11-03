/**
 * Connection Test Script for LearnByAi Platform
 * Tests Supabase, MongoDB, and Pinecone connections
 */

import { MongoClient } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import { Pinecone } from "@pinecone-database/pinecone";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testSupabase() {
  log("\n📊 Testing Supabase Connection...", colors.blue);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by querying users table
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      throw error;
    }

    log("✅ Supabase connection successful!", colors.green);
    log(`   URL: ${supabaseUrl}`, colors.green);
    log(`   Tables accessible: users`, colors.green);

    return true;
  } catch (error: any) {
    log("❌ Supabase connection failed!", colors.red);
    log(`   Error: ${error.message}`, colors.red);
    return false;
  }
}

async function testMongoDB() {
  log("\n🍃 Testing MongoDB Connection...", colors.blue);

  let client: MongoClient | null = null;

  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!mongoUri) {
      throw new Error("Missing MongoDB URI");
    }

    log(
      `   Connecting to: ${mongoUri.split("@")[1] || "MongoDB"}`,
      colors.yellow,
    );

    client = new MongoClient(mongoUri);
    await client.connect();

    const db = client.db(dbName || "learnbyai_platform");

    // Test connection
    await db.admin().ping();

    // List collections
    const collections = await db.listCollections().toArray();

    log("✅ MongoDB connection successful!", colors.green);
    log(`   Database: ${dbName || "learnbyai_platform"}`, colors.green);
    log(
      `   Collections: ${collections.length > 0 ? collections.map((c) => c.name).join(", ") : "None (will be created automatically)"}`,
      colors.green,
    );

    return true;
  } catch (error: any) {
    log("❌ MongoDB connection failed!", colors.red);
    log(`   Error: ${error.message}`, colors.red);

    // Check for common issues
    if (error.message.includes("Authentication failed")) {
      log("\n💡 Tip: Check your MongoDB username and password", colors.yellow);
      log(
        "   Make sure special characters in password are URL encoded",
        colors.yellow,
      );
    } else if (error.message.includes("ENOTFOUND")) {
      log("\n💡 Tip: Check your MongoDB cluster URL", colors.yellow);
      log("   Make sure the cluster is not paused", colors.yellow);
    } else if (error.message.includes("IP")) {
      log(
        "\n💡 Tip: Add your IP address to MongoDB Atlas whitelist",
        colors.yellow,
      );
    }

    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function testPinecone() {
  log("\n🌲 Testing Pinecone Connection...", colors.blue);

  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!apiKey) {
      throw new Error("Missing Pinecone API key");
    }

    if (!indexName) {
      throw new Error("Missing Pinecone index name");
    }

    const pinecone = new Pinecone({
      apiKey: apiKey,
    });

    // List indexes
    const indexes = await pinecone.listIndexes();

    log("✅ Pinecone connection successful!", colors.green);
    log(`   API Key: ${apiKey.substring(0, 10)}...`, colors.green);
    log(
      `   Available indexes: ${indexes.indexes?.map((i) => i.name).join(", ") || "None"}`,
      colors.green,
    );

    // Check if our index exists
    const indexExists = indexes.indexes?.some((i) => i.name === indexName);

    if (indexExists) {
      log(`   ✓ Index "${indexName}" exists`, colors.green);

      // Get index stats
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      log(`   Vectors in index: ${stats.totalRecordCount || 0}`, colors.green);
    } else {
      log(`   ⚠️  Index "${indexName}" not found`, colors.yellow);
      log(
        "   You need to create this index in Pinecone dashboard",
        colors.yellow,
      );
      log("   Recommended settings:", colors.yellow);
      log("   - Dimensions: 1536 (for text-embedding-3-small)", colors.yellow);
      log("   - Metric: cosine", colors.yellow);
    }

    return true;
  } catch (error: any) {
    log("❌ Pinecone connection failed!", colors.red);
    log(`   Error: ${error.message}`, colors.red);

    if (error.message.includes("Invalid API key")) {
      log("\n💡 Tip: Check your Pinecone API key", colors.yellow);
      log("   Get it from: https://app.pinecone.io/", colors.yellow);
    }

    return false;
  }
}

async function runAllTests() {
  log("═══════════════════════════════════════════════", colors.blue);
  log("  LearnByAi Platform - Connection Test", colors.blue);
  log("═══════════════════════════════════════════════", colors.blue);

  const results = {
    supabase: false,
    mongodb: false,
    pinecone: false,
  };

  results.supabase = await testSupabase();
  results.mongodb = await testMongoDB();
  results.pinecone = await testPinecone();

  log("\n═══════════════════════════════════════════════", colors.blue);
  log("  Summary", colors.blue);
  log("═══════════════════════════════════════════════", colors.blue);

  const total = Object.values(results).filter(Boolean).length;
  const allPassed = total === 3;

  log(
    `\nSupabase (PostgreSQL): ${results.supabase ? "✅ Connected" : "❌ Failed"}`,
    results.supabase ? colors.green : colors.red,
  );
  log(
    `MongoDB: ${results.mongodb ? "✅ Connected" : "❌ Failed"}`,
    results.mongodb ? colors.green : colors.red,
  );
  log(
    `Pinecone: ${results.pinecone ? "✅ Connected" : "❌ Failed"}`,
    results.pinecone ? colors.green : colors.red,
  );

  log(
    `\nResult: ${total}/3 connections successful\n`,
    allPassed ? colors.green : colors.yellow,
  );

  if (allPassed) {
    log("🎉 All database connections are working!", colors.green);
    log("You can now proceed with development.\n", colors.green);
  } else {
    log(
      "⚠️  Some connections failed. Please fix them before proceeding.\n",
      colors.yellow,
    );
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
