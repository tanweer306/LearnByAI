"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Video,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Clock,
  User,
  BookOpen,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Radio,
} from "lucide-react";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface Session {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  meeting_link: string;
  class_minutes: string | null;
  topics_covered: string[] | null;
  homework_assigned: string | null;
  homework_due_date: string | null;
  classes: {
    name: string;
    subject: string;
  };
  users: {
    first_name: string;
    last_name: string;
  };
}

export default function StudentSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}`);
      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <StudentHeader userName="" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <StudentHeader userName="" />
        <div className="container mx-auto px-4 py-8">
          <p>Session not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <StudentHeader userName="" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Live Classes
        </Button>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{session.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {session.classes.name} - {session.classes.subject}
                  </p>
                </div>
              </div>
              {session.status === "live" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium animate-pulse">
                  <Radio className="h-3 w-3" />
                  LIVE
                </span>
              )}
            </div>

            {session.description && (
              <p className="text-muted-foreground mb-4">{session.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(session.scheduled_start)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Teacher: {session.users.first_name} {session.users.last_name}</span>
              </div>
            </div>

            {/* Join Button for Live Sessions */}
            {session.status === "live" && (
              <div className="p-4 bg-red-500/10 border-2 border-red-500 rounded-lg">
                <p className="font-medium text-red-700 dark:text-red-400 mb-3">
                  This class is live now! Click below to join.
                </p>
                <Button
                  onClick={() => router.push(`/dashboard/live-session/${session.id}/room`)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-lg py-6"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Join Live Class
                </Button>
              </div>
            )}

            {/* Scheduled Session Info */}
            {session.status === "scheduled" && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                  This class is scheduled for:
                </p>
                <p className="text-blue-600 dark:text-blue-500">
                  {formatDate(session.scheduled_start)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  You'll receive a notification when the class starts
                </p>
              </div>
            )}
          </div>

          {/* Class Materials (After Session Ends) */}
          {session.status === "ended" && (
            <>
              {session.class_minutes && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Class Notes</h2>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {session.class_minutes}
                  </p>
                </div>
              )}

              {session.topics_covered && session.topics_covered.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Topics Covered</h2>
                  </div>
                  <ul className="space-y-2">
                    {session.topics_covered.map((topic, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {session.homework_assigned && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <h2 className="text-xl font-bold">Homework Assignment</h2>
                  </div>
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <p className="text-muted-foreground mb-3">
                      {session.homework_assigned}
                    </p>
                    {session.homework_due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-700 dark:text-orange-400">
                          Due: {formatDate(session.homework_due_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!session.class_minutes && !session.topics_covered && !session.homework_assigned && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No class materials available yet
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
