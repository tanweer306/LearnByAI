"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// This page has been deprecated. AI Tutor is now accessed through the Books page.
// Users should go to My Books, select a book, and click "Open" to use AI Tutor.

export default function TeacherAITutorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to books page
    router.push("/dashboard/books");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-muted-foreground">
          Redirecting to My Books...
        </p>
      </div>
    </div>
  );
}
