import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Plus, Mail, Phone, Calendar } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionTeachersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch institution data
  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData || (userData.role !== "admin" && userData.user_type !== "institution")) {
    redirect("/dashboard");
  }

  // Fetch teachers
  const { data: teachers } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("role", "teacher")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <InstitutionHeader userName={userData.institution_name || "Institution"} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Faculty Members</h1>
            <p className="text-muted-foreground">
              Manage teachers and instructors
            </p>
          </div>
          <Link href="/dashboard/institution/teachers/add">
            <Button className="bg-gradient-to-r from-[#99CE79] to-[#7AB85C]">
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </Link>
        </div>

        {teachers && teachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#99CE79] to-[#7AB85C] flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{teacher.email}</span>
                  </div>
                  {teacher.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined {new Date(teacher.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No teachers yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first teacher to get started
            </p>
            <Link href="/dashboard/institution/teachers/add">
              <Button className="bg-gradient-to-r from-[#99CE79] to-[#7AB85C]">
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
