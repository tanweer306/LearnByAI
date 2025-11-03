"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";
import UploadFormWithProgress from "@/components/books/UploadFormWithProgress";

export default function StudentUploadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName="Student" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/student">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent gradient-text">
              Upload Study Materials
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your textbooks and study resources to get started
          </p>
        </div>

        {/* Upload Form With Progress */}
        <div className="max-w-4xl mx-auto">
          <UploadFormWithProgress 
            userRole="student"
            onSuccess={() => router.push("/dashboard/books")}
          />
        </div>
      </main>
    </div>
  );
}
