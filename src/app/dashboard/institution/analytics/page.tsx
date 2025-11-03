import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionAnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData || (userData.role !== "admin" && userData.user_type !== "institution")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <InstitutionHeader institutionName={userData.institution_name || "Institution"} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Track performance and engagement across your institution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">0</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">0</p>
            <p className="text-sm text-muted-foreground">Total Teachers</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">0</p>
            <p className="text-sm text-muted-foreground">Active Classes</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">0%</p>
            <p className="text-sm text-muted-foreground">Engagement Rate</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Coming Soon</h2>
          </div>
          <p className="text-muted-foreground">
            Detailed analytics and reporting features are under development.
          </p>
        </div>
      </div>
    </div>
  );
}
