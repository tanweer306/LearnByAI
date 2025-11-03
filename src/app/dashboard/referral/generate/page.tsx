/**
 * Referral Link Generation Page
 * Allows teachers and institutes to generate discount/free subscription links
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import ReferralLinkGenerator from "@/components/shared/ReferralLinkGenerator";

interface UserData {
  id: string;
  role: string;
  availableSeats?: number;
  canOfferDiscount?: boolean;
  maxDiscountPercentage?: number;
}

interface ClassData {
  id: string;
  name: string;
}

export default function GenerateReferralPage() {
  const { user } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user data and subscription info
      const userResponse = await fetch("/api/user/profile");
      const userData = await userResponse.json();

      // Fetch classes if teacher
      let classesData: ClassData[] = [];
      if (userData.role === "teacher") {
        const classesResponse = await fetch("/api/classes/list");
        const classesResult = await classesResponse.json();
        classesData = classesResult.classes || [];
      }

      setUserData({
        id: userData.id,
        role: userData.role,
        availableSeats: userData.availableSeats || 0,
        canOfferDiscount: userData.canOfferDiscount || false,
        maxDiscountPercentage: userData.maxDiscountPercentage || 30,
      });
      setClasses(classesData);
    } catch (error) {
      console.error("Error fetching user data:", error);
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

  if (!userData || (userData.role !== "teacher" && userData.role !== "institute")) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              Only teachers and institutes can generate referral links.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
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
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
              Generate Referral Link
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            {userData.role === "teacher"
              ? "Create a discount link for students in your class"
              : "Create free or discounted subscription links for your students"}
          </p>
        </div>

        {/* Generator Component */}
        <div className="max-w-2xl mx-auto">
          <ReferralLinkGenerator
            userId={userData.id}
            userRole={userData.role as "teacher" | "institute"}
            classes={classes}
            availableSeats={userData.availableSeats}
            canOfferDiscount={userData.canOfferDiscount}
            maxDiscountPercentage={userData.maxDiscountPercentage}
          />
        </div>

        {/* Info Cards */}
        <div className="max-w-2xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">How It Works</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>1. Configure your link settings</li>
              <li>2. Generate a unique referral link</li>
              <li>3. Share the link with your students</li>
              <li>4. Students sign up with automatic discount</li>
              <li>5. Track usage in the management dashboard</li>
            </ul>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Best Practices</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Set expiry dates for time-limited offers</li>
              <li>• Use descriptions to organize links</li>
              <li>• Monitor usage regularly</li>
              <li>• Deactivate unused links</li>
              <li>• Create separate links per class/cohort</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
