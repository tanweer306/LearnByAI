/**
 * Book Upload Quota Display Component
 * Shows lifetime book upload quota with progress bar
 */

"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatLimit, getUsagePercentage } from "@/lib/config/feature-limits";

interface BookUploadQuotaProps {
  userId: string;
  className?: string;
}

interface QuotaData {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  canUpload: boolean;
  planName?: string;
  role?: string;
}

export default function BookUploadQuota({ userId, className = "" }: BookUploadQuotaProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuota();
  }, [userId]);

  const fetchQuota = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/books/quota?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch quota");
      }

      const data = await response.json();
      setQuota(data);
    } catch (err) {
      console.error("Error fetching quota:", err);
      setError("Unable to load quota information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-card border-2 rounded-xl p-6 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className={`bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error || "Unable to load quota"}</p>
        </div>
      </div>
    );
  }

  const { current, limit, remaining, percentage, canUpload, planName, role } = quota;
  const isUnlimited = limit === Infinity || limit >= 999999;
  const isNearLimit = percentage >= 80 && !isUnlimited;
  const hasReachedLimit = !canUpload && !isUnlimited;

  // Color scheme based on usage
  const getColorScheme = () => {
    if (hasReachedLimit) {
      return {
        bg: "bg-red-50 dark:bg-red-950/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-700 dark:text-red-300",
        progress: "bg-red-500",
      };
    }
    if (isNearLimit) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-700 dark:text-amber-300",
        progress: "bg-amber-500",
      };
    }
    return {
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      progress: "bg-green-500",
    };
  };

  const colors = getColorScheme();

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className={`h-5 w-5 ${colors.text}`} />
          <h3 className={`font-semibold ${colors.text}`}>
            Book Upload Quota
          </h3>
        </div>
        {planName && (
          <span className="text-xs px-2 py-1 bg-white/50 dark:bg-black/20 rounded-full">
            {planName}
          </span>
        )}
      </div>

      {/* Quota Display */}
      {isUnlimited ? (
        <div className="text-center py-4">
          <p className={`text-2xl font-bold ${colors.text}`}>∞</p>
          <p className="text-sm text-muted-foreground mt-1">Unlimited Books</p>
          <p className="text-xs text-muted-foreground mt-2">
            You've uploaded {current} books so far
          </p>
        </div>
      ) : (
        <>
          {/* Numbers */}
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-2xl font-bold ${colors.text}`}>
                {current}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatLimit(limit)} books
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {remaining} {remaining === 1 ? "book" : "books"} remaining (Lifetime)
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Progress 
              value={percentage} 
              className="h-2"
              indicatorClassName={colors.progress}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {percentage.toFixed(0)}% used
            </p>
          </div>
        </>
      )}

      {/* Status Message */}
      {hasReachedLimit && (
        <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-3`}>
          <p className={`text-sm font-medium ${colors.text} flex items-center gap-2`}>
            <AlertCircle className="h-4 w-4" />
            Limit Reached
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You've uploaded all {limit} books allowed on your plan. Upgrade to upload more.
          </p>
        </div>
      )}

      {isNearLimit && !hasReachedLimit && (
        <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-3`}>
          <p className={`text-sm font-medium ${colors.text} flex items-center gap-2`}>
            <TrendingUp className="h-4 w-4" />
            Almost There
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You have {remaining} {remaining === 1 ? "upload" : "uploads"} remaining. Consider upgrading soon.
          </p>
        </div>
      )}

      {/* Upgrade CTA */}
      {!isUnlimited && (hasReachedLimit || isNearLimit) && (
        <Link href="/pricing">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </Link>
      )}

      {/* Info Note */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        💡 Book limits are <strong>lifetime</strong> and never reset
      </p>
    </div>
  );
}
