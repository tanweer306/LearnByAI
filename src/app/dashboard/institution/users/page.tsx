import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionUsersPage() {
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
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users in your institution
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">User Management</h2>
          <p className="text-muted-foreground mb-6">
            This feature is coming soon. You'll be able to manage students, teachers, and staff from here.
          </p>
        </div>
      </div>
    </div>
  );
}
