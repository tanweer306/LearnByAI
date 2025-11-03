import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, GraduationCap, Plus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionClassesPage() {
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

  // Fetch all classes
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select(`
      *,
      users!classes_teacher_id_fkey(first_name, last_name, email)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <InstitutionHeader institutionName={userData.institution_name || "Institution"} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Classes</h1>
            <p className="text-muted-foreground">
              Manage all classes in your institution
            </p>
          </div>
        </div>

        {classes && classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem: any) => (
              <div
                key={classItem.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  {classItem.grade_level && (
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                      Grade {classItem.grade_level}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-2">{classItem.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {classItem.subject}
                </p>

                {classItem.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {classItem.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    Teacher: {classItem.users?.first_name} {classItem.users?.last_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground">
              Teachers will create classes once they join your institution
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
