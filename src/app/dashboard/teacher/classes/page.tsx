import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Calendar } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

export default async function TeacherClassesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch teacher data
  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData) {
    redirect("/onboarding");
  }

  // Fetch classes
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("*, class_members(count)")
    .eq("teacher_id", userData.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Classes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your classes and students
            </p>
          </div>
          <Link href="/dashboard/teacher/classes/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        </div>

        {/* Classes Grid */}
        {classes && classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem: any) => (
              <Link
                key={classItem.id}
                href={`/dashboard/teacher/classes/${classItem.id}`}
              >
                <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-[#99CE79] p-3 rounded-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {classItem.class_code}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {classItem.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {classItem.description || "No description"}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{classItem.class_members?.[0]?.count || 0} students</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{classItem.schedule || "No schedule"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first class to start teaching
            </p>
            <Link href="/dashboard/teacher/classes/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
