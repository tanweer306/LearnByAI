import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import {
  getDashboardStats,
  getCacheStats,
  getMonthlyProjection,
  formatCost,
  formatHitRate,
} from "@/lib/cache-analytics";
import { getRedisInfo } from "@/lib/redis";

/**
 * GET /api/admin/cache-stats
 * Returns comprehensive cache analytics and performance metrics
 */
export async function GET() {
  try {
    // Verify admin authentication
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Redis connection info
    const redisInfo = await getRedisInfo();

    // Get comprehensive stats
    const dashboardStats = await getDashboardStats();
    const monthlyProjection = await getMonthlyProjection();

    // Format response
    const response = {
      redis: {
        connected: redisInfo.connected,
        latency: redisInfo.latency,
        error: redisInfo.error,
      },
      performance: {
        hourly: {
          hitRate: formatHitRate(dashboardStats.hourly.hitRate),
          hitRateRaw: dashboardStats.hourly.hitRate,
          totalRequests: dashboardStats.hourly.totalRequests,
          cacheHits: dashboardStats.hourly.cacheHits,
          cacheMisses: dashboardStats.hourly.cacheMisses,
          tokensSaved: dashboardStats.hourly.tokensSaved,
          costSaved: formatCost(dashboardStats.hourly.costSaved),
          costSavedRaw: dashboardStats.hourly.costSaved,
        },
        daily: {
          hitRate: formatHitRate(dashboardStats.daily.hitRate),
          hitRateRaw: dashboardStats.daily.hitRate,
          totalRequests: dashboardStats.daily.totalRequests,
          cacheHits: dashboardStats.daily.cacheHits,
          cacheMisses: dashboardStats.daily.cacheMisses,
          tokensSaved: dashboardStats.daily.tokensSaved,
          costSaved: formatCost(dashboardStats.daily.costSaved),
          costSavedRaw: dashboardStats.daily.costSaved,
        },
        weekly: {
          hitRate: formatHitRate(dashboardStats.weekly.hitRate),
          hitRateRaw: dashboardStats.weekly.hitRate,
          totalRequests: dashboardStats.weekly.totalRequests,
          cacheHits: dashboardStats.weekly.cacheHits,
          cacheMisses: dashboardStats.weekly.cacheMisses,
          tokensSaved: dashboardStats.weekly.tokensSaved,
          costSaved: formatCost(dashboardStats.weekly.costSaved),
          costSavedRaw: dashboardStats.weekly.costSaved,
        },
      },
      endpoints: dashboardStats.endpoints.map((endpoint) => ({
        endpoint: endpoint.endpoint,
        hits: endpoint.hits,
        misses: endpoint.misses,
        totalRequests: endpoint.hits + endpoint.misses,
        hitRate: formatHitRate(endpoint.hitRate),
        hitRateRaw: endpoint.hitRate,
      })),
      projections: {
        currentDailySavings: formatCost(monthlyProjection.currentDailySavings),
        projectedMonthlySavings: formatCost(monthlyProjection.projectedMonthlySavings),
        projectedYearlySavings: formatCost(monthlyProjection.projectedYearlySavings),
        currentDailySavingsRaw: monthlyProjection.currentDailySavings,
        projectedMonthlySavingsRaw: monthlyProjection.projectedMonthlySavings,
        projectedYearlySavingsRaw: monthlyProjection.projectedYearlySavings,
      },
      summary: {
        overallHitRate: formatHitRate(dashboardStats.daily.hitRate),
        totalRequestsToday: dashboardStats.daily.totalRequests,
        tokensSavedToday: dashboardStats.daily.tokensSaved,
        costSavedToday: formatCost(dashboardStats.daily.costSaved),
        estimatedMonthlySavings: formatCost(monthlyProjection.projectedMonthlySavings),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[CACHE STATS ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch cache statistics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
