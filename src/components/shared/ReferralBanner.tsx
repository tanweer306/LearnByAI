/**
 * Referral Banner Component
 * Displays discount information when user arrives via referral link
 */

"use client";

import { useEffect, useState } from "react";
import { Gift, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralBannerProps {
  referralCode: string | null;
  onValidated?: (data: any) => void;
}

interface ReferralData {
  valid: boolean;
  link?: {
    discountPercentage: number;
    description?: string;
    customMessage?: string;
  };
  creator?: {
    name: string;
    role: string;
  };
  discount?: {
    percentage: number;
    isFree: boolean;
    message: string;
  };
  error?: string;
}

export default function ReferralBanner({
  referralCode,
  onValidated,
}: ReferralBannerProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (referralCode && !dismissed) {
      validateReferralCode(referralCode);
    }
  }, [referralCode, dismissed]);

  const validateReferralCode = async (code: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral/validate?code=${code}`);
      const data = await response.json();

      setReferralData(data);

      if (data.valid && onValidated) {
        onValidated(data);
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      setReferralData({
        valid: false,
        error: "Failed to validate referral code",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!referralCode || dismissed || loading) {
    return null;
  }

  if (!referralData) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Validating referral code...</span>
        </div>
      </div>
    );
  }

  if (!referralData.valid) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <X className="h-5 w-5" />
            <span className="text-sm font-medium">
              {referralData.error || "Invalid referral code"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-red-700 dark:text-red-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const { discount, creator, link } = referralData;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-200 dark:border-green-800 p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white">
              <Gift className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">
                  {discount?.message || "Discount Applied!"}
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                {link?.customMessage ||
                  (creator
                    ? `Invited by ${creator.name} (${creator.role})`
                    : link?.description || "Special discount for you")}
              </p>
            </div>
          </div>

          {/* Discount Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {discount?.isFree ? "FREE" : `${discount?.percentage}% OFF`}
              </div>
              {!discount?.isFree && (
                <p className="text-xs text-green-700 dark:text-green-300">
                  on your subscription
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-green-700 dark:text-green-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
