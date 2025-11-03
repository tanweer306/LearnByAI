"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Copy,
  Users,
  UserPlus,
  Link as LinkIcon,
  Mail,
  Loader2,
  CheckCircle,
  Video,
} from "lucide-react";
import Link from "next/link";

interface ClassData {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade_level: string;
  class_code: string;
  start_date: string;
  end_date: string;
  schedule_time: string;
  schedule_days: string[];
  created_at: string;
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentMode, setEnrollmentMode] = useState<"link" | "bulk" | null>(null);
  const [bulkEmails, setBulkEmails] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const joinLink = `${window.location.origin}/join-class/${classData?.class_code}`;

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassData(data.class);
      }
    } catch (error) {
      console.error("Error fetching class:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleBulkEnroll = async () => {
    setEnrolling(true);
    try {
      const emails = bulkEmails
        .split(/[\n,]/)
        .map((e) => e.trim())
        .filter((e) => e);

      const response = await fetch(`/api/classes/${classId}/enroll-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      if (response.ok) {
        alert("Students enrolled successfully!");
        setBulkEmails("");
        setEnrollmentMode(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to enroll students");
      }
    } catch (error) {
      alert("Error enrolling students");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Class Not Found</h2>
          <Link href="/dashboard/teacher/classes">
            <Button>Back to Classes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/dashboard/teacher/classes">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-muted-foreground mt-1">{classData.subject}</p>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                Class Created Successfully!
              </h3>
              <p className="text-green-700 dark:text-green-300 mt-1">
                Your class has been created. Now you can invite students to join.
              </p>
            </div>
          </div>
        </div>

        {/* Class Details */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Class Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Class Code:</span>
              <p className="font-mono font-semibold text-lg">{classData.class_code}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Grade Level:</span>
              <p className="font-medium">{classData.grade_level || "Not specified"}</p>
            </div>
            {classData.start_date && (
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <p className="font-medium">
                  {new Date(classData.start_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {classData.end_date && (
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <p className="font-medium">
                  {new Date(classData.end_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {classData.schedule_time && (
              <div>
                <span className="text-muted-foreground">Class Time:</span>
                <p className="font-medium">{classData.schedule_time}</p>
              </div>
            )}
            {classData.schedule_days && classData.schedule_days.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Days:</span>
                <p className="font-medium">{classData.schedule_days.join(", ")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Enrollment Options */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Add Students to Class</h2>

          {/* Option 1: Share Join Link */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <LinkIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Share Join Link</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share this link with students. They can join the class by clicking it.
                </p>
                <div className="flex gap-2">
                  <Input value={joinLink} readOnly className="font-mono text-sm" />
                  <Button onClick={copyJoinLink} variant="outline">
                    {copySuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Bulk Add Students */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Bulk Add Students</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add multiple students at once by entering their email addresses or usernames.
                </p>
                {enrollmentMode === "bulk" ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-emails">
                        Enter email addresses (one per line or comma-separated)
                      </Label>
                      <Textarea
                        id="bulk-emails"
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleBulkEnroll} disabled={enrolling || !bulkEmails.trim()}>
                        {enrolling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Enroll Students
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEnrollmentMode(null);
                          setBulkEmails("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setEnrollmentMode("bulk")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Start Bulk Enrollment
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Live Classes Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Video className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Live Classes Coming Soon!</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Soon you'll be able to conduct live video classes with your students using integrated video conferencing.
                </p>
                <Button variant="outline" disabled>
                  <Video className="h-4 w-4 mr-2" />
                  Enable Live Classes (Coming Soon)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link href="/dashboard/teacher/classes" className="flex-1">
            <Button variant="outline" className="w-full">
              Done
            </Button>
          </Link>
          <Link href={`/dashboard/teacher/classes/${classId}/manage`} className="flex-1">
            <Button className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Manage Class
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
