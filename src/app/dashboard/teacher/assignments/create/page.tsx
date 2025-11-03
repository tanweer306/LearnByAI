"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AssignmentCreator from "@/components/assignments/AssignmentCreator";

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes/my-classes");
        const data = await res.json();
        setClasses(data.classes || []);
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleSave = async (data: any) => {
    try {
      const response = await fetch("/api/assignments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save assignment");
      }

      router.push("/dashboard/teacher/assignments");
    } catch (error) {
      console.error("Error saving assignment:", error);
      alert(error instanceof Error ? error.message : "Failed to save assignment");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard/teacher/assignments">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Assignment</h1>
          <p className="text-muted-foreground mt-1">
            Create a multi-question assignment with various question types
          </p>
        </div>

        <AssignmentCreator
          onSave={handleSave}
          onCancel={() => router.push("/dashboard/teacher/assignments")}
          classes={classes}
        />
      </div>
    </div>
  );
}