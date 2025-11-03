import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Video, Link as LinkIcon } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import TeacherHeader from "@/components/dashboard/TeacherHeader";
import Link from "next/link";

export default async function TeacherResourcesPage() {
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

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader userName={userData.first_name || "Teacher"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Teaching Resources</h1>
          <p className="text-muted-foreground mt-1">
            Access helpful resources and materials for teaching
          </p>
        </div>

        {/* Resource Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/books">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg w-fit mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">My Books</h3>
              <p className="text-sm text-muted-foreground">
                Access and manage your uploaded textbooks and materials
              </p>
            </div>
          </Link>

          <Link href="/dashboard/quiz/generate">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quiz Generator</h3>
              <p className="text-sm text-muted-foreground">
                Create AI-powered quizzes from your books
              </p>
            </div>
          </Link>

          <Link href="/dashboard/study-plan/generate">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="bg-purple-100 dark:bg-purple-950 p-3 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Study Plans</h3>
              <p className="text-sm text-muted-foreground">
                Generate personalized study plans for students
              </p>
            </div>
          </Link>


          <Link href="/dashboard/referral/manage">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="bg-pink-100 dark:bg-pink-950 p-3 rounded-lg w-fit mb-4">
                <LinkIcon className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Referral Links</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage student referral links
              </p>
            </div>
          </Link>

          <div className="border rounded-lg p-6 opacity-50">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg w-fit mb-4">
              <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">More Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Additional teaching resources will be added
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/books/upload">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Upload New Book
              </Button>
            </Link>
            <Link href="/dashboard/teacher/classes/create">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Create New Class
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
