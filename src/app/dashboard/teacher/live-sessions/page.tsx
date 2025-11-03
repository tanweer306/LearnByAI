"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  PlayCircle,
  StopCircle,
  Eye,
  Loader2,
  Radio,
} from "lucide-react";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  meeting_link: string;
  classes: {
    name: string;
    subject: string;
  };
  attendance_summary?: {
    total: number;
    present: number;
    absent: number;
  };
}

export default function TeacherLiveSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "live" | "past">("upcoming");
  const [startingSession, setStartingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    // Refresh every 30 seconds to check for live sessions
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchSessions = async () => {
    try {
      let status = "all";
      if (activeTab === "upcoming") status = "scheduled";
      if (activeTab === "live") status = "live";
      if (activeTab === "past") status = "ended";

      const response = await fetch(`/api/live-sessions/list?status=${status}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    setStartingSession(sessionId);
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}/start`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchSessions();
        // Navigate to session detail page
        router.push(`/dashboard/teacher/live-sessions/${sessionId}`);
      } else {
        alert("Failed to start session");
      }
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session");
    } finally {
      setStartingSession(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium animate-pulse">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
        );
      case "scheduled":
        return (
          <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
            Scheduled
          </span>
        );
      case "ended":
        return (
          <span className="px-3 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
            Ended
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "upcoming") return session.status === "scheduled";
    if (activeTab === "live") return session.status === "live";
    if (activeTab === "past") return session.status === "ended";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <TeacherHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Live Sessions</h1>
              <p className="text-muted-foreground">
                Manage your live classes and sessions
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/dashboard/teacher/live-sessions/create")}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "upcoming"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upcoming
            {activeTab === "upcoming" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "live"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live Now
            {sessions.filter((s) => s.status === "live").length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                {sessions.filter((s) => s.status === "live").length}
              </span>
            )}
            {activeTab === "live" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === "past"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Past Sessions
            {activeTab === "past" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === "upcoming" && "You don't have any upcoming sessions"}
              {activeTab === "live" && "No sessions are currently live"}
              {activeTab === "past" && "You don't have any past sessions"}
            </p>
            {activeTab === "upcoming" && (
              <Button
                onClick={() => router.push("/dashboard/teacher/live-sessions/create")}
                className="bg-gradient-to-r from-red-500 to-red-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Session
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow ${
                  session.status === "live" ? "ring-2 ring-red-500" : ""
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  {getStatusBadge(session.status)}
                  <span className="text-xs text-muted-foreground">
                    {session.classes.name}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">{session.title}</h3>
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {session.description}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(session.scheduled_start)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatTime(session.scheduled_start)} -{" "}
                      {formatTime(session.scheduled_end)}
                    </span>
                  </div>
                  {session.attendance_summary && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {session.attendance_summary.present} /{" "}
                        {session.attendance_summary.total} present
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === "scheduled" && (
                    <>
                      <Button
                        onClick={() => handleStartSession(session.id)}
                        disabled={startingSession === session.id}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      >
                        {startingSession === session.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Session
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(`/dashboard/teacher/live-sessions/${session.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {session.status === "live" && (
                    <>
                      <Button
                        onClick={() =>
                          router.push(`/dashboard/teacher/live-sessions/${session.id}`)
                        }
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        End Session
                      </Button>
                    </>
                  )}

                  {session.status === "ended" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/teacher/live-sessions/${session.id}`)
                      }
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
