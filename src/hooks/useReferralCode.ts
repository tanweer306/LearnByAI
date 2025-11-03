/**
 * useReferralCode Hook
 * Manages referral code from URL and localStorage
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ReferralCodeData {
  code: string | null;
  discountPercentage: number;
  isFree: boolean;
  linkId: string | null;
}

export function useReferralCode() {
  const searchParams = useSearchParams();
  const [referralData, setReferralData] = useState<ReferralCodeData>({
    code: null,
    discountPercentage: 0,
    isFree: false,
    linkId: null,
  });

  useEffect(() => {
    // Check URL for ref parameter
    const refCode = searchParams.get("ref");

    if (refCode) {
      // Store in localStorage for persistence across pages
      localStorage.setItem("referralCode", refCode);
      setReferralData((prev) => ({ ...prev, code: refCode }));
    } else {
      // Check localStorage
      const storedCode = localStorage.getItem("referralCode");
      if (storedCode) {
        setReferralData((prev) => ({ ...prev, code: storedCode }));
      }
    }
  }, [searchParams]);

  const setReferralInfo = (data: {
    discountPercentage: number;
    isFree: boolean;
    linkId: string;
  }) => {
    setReferralData((prev) => ({
      ...prev,
      discountPercentage: data.discountPercentage,
      isFree: data.isFree,
      linkId: data.linkId,
    }));
    localStorage.setItem("referralInfo", JSON.stringify(data));
  };

  const clearReferralCode = () => {
    localStorage.removeItem("referralCode");
    localStorage.removeItem("referralInfo");
    setReferralData({
      code: null,
      discountPercentage: 0,
      isFree: false,
      linkId: null,
    });
  };

  const redeemReferralCode = async () => {
    if (!referralData.code) {
      return { success: false, error: "No referral code found" };
    }

    try {
      const response = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkCode: referralData.code }),
      });

      const data = await response.json();

      if (response.ok) {
        clearReferralCode();
        return { success: true, data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error redeeming referral code:", error);
      return { success: false, error: "Failed to redeem referral code" };
    }
  };

  return {
    referralCode: referralData.code,
    discountPercentage: referralData.discountPercentage,
    isFree: referralData.isFree,
    linkId: referralData.linkId,
    hasReferralCode: !!referralData.code,
    setReferralInfo,
    clearReferralCode,
    redeemReferralCode,
  };
}
