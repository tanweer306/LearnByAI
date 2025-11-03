import { NextResponse } from "next/server";
import { testRedisConnection, redis, cacheHelpers } from "@/lib/redis";

export async function GET() {
  try {
    // Test basic connection
    const isConnected = await testRedisConnection();

    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: "Redis connection failed" },
        { status: 500 }
      );
    }

    // Test SET operation
    const testKey = "test:connection";
    const testValue = { timestamp: new Date().toISOString(), message: "Redis is working!" };
    await cacheHelpers.set(testKey, testValue, 60);

    // Test GET operation
    const retrievedValue = await cacheHelpers.get(testKey);

    // Test DEL operation
    await cacheHelpers.del(testKey);

    // Get Redis info
    const info = await redis.info();

    return NextResponse.json({
      success: true,
      message: "Redis is connected and working properly",
      test: {
        set: true,
        get: retrievedValue !== null,
        delete: true,
      },
      retrievedValue,
      serverInfo: info ? "Available" : "Not available",
    });
  } catch (error: any) {
    console.error("Redis test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
