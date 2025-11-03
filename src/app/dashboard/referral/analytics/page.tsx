/**
 * Referral Analytics Dashboard
 * View performance metrics and insights for referral links
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Users,
  Link as LinkIcon,
  Gift,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Award,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import { Badge } from "@/components/ui/badge";

interface Analytics {
  overview: {
    totalLinks: number;
    activeLinks: number;
    expiredLinks: number;
    maxUsesReachedLinks: number;
    totalRedemptions: number;
    averageDiscount: number;
    conversionRate: number;
  };
  redemptionsByType: Record<string, { count: number; redemptions: number }>;
  topLinks: Array<{
    id: string;
    linkCode: string;
    description: string;
    discountPercentage: number;
    currentUses: number;
    maxUses: number | null;
    createdAt: string;
  }>;
  recentRedemptions: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    discountApplied: number;
    redeemedAt: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    linksCreated: number;
    redemptions: number;
  }>;
}

export default function ReferralAnalyticsPage() {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/referral/analytics");

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#99CE79]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/referral/manage">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Manage Links
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
                  Referral Analytics
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Track performance and insights for your referral links
              </p>
            </div>
            <Button
              onClick={fetchAnalytics}
              variant="outline"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {analytics && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Links
                    </CardTitle>
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.overview.totalLinks}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.overview.activeLinks} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Redemptions
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.overview.totalRedemptions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students signed up
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. Discount
                    </CardTitle>
                    <Gift className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.overview.averageDiscount}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all links
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Conversion Rate
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.overview.conversionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Redemptions per link
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#99CE79]" />
                  Monthly Trend
                </CardTitle>
                <CardDescription>
                  Links created and redemptions over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">
                        {month.month}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs text-muted-foreground w-20">
                            Links: {month.linksCreated}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (month.linksCreated / 10) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground w-20">
                            Uses: {month.redemptions}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-[#99CE79] h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (month.redemptions / 50) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Performing Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#99CE79]" />
                    Top Performing Links
                  </CardTitle>
                  <CardDescription>
                    Links with the most redemptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No links created yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.topLinks.map((link, index) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#99CE79]/20 text-[#99CE79] font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono">
                                {link.linkCode}
                              </code>
                              <Badge variant="secondary">
                                {link.discountPercentage}%
                              </Badge>
                            </div>
                            {link.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {link.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {link.currentUses}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {link.maxUses ? `/ ${link.maxUses}` : "uses"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Redemptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#99CE79]" />
                    Recent Redemptions
                  </CardTitle>
                  <CardDescription>
                    Latest students who signed up
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentRedemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No redemptions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.recentRedemptions.map((redemption) => (
                        <div
                          key={redemption.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {redemption.studentName || "Student"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {redemption.studentEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-500">
                              {redemption.discountApplied}% off
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(redemption.redeemedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Redemptions by Type */}
            {Object.keys(analytics.redemptionsByType).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Redemptions by Link Type</CardTitle>
                  <CardDescription>
                    Breakdown of redemptions by link category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(analytics.redemptionsByType).map(
                      ([type, data]) => (
                        <div
                          key={type}
                          className="p-4 bg-muted/50 rounded-lg text-center"
                        >
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            {type.replace(/_/g, " ").toUpperCase()}
                          </p>
                          <p className="text-2xl font-bold mb-1">
                            {data.redemptions}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            from {data.count} {data.count === 1 ? "link" : "links"}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
