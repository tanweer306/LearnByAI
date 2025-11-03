"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  Radio,
  BookOpen,
} from "lucide-react";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: "scheduled" | "live" | "ended";
  meeting_link: string;
  classes: {
    name: string;
    subject: string;
  };
  users: {
    first_name: string;
    last_name: string;
  };
}

export default function StudentLiveClassesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "live" | "past">("upcoming");

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

  const getTimeUntilSession = (scheduledStart: string) => {
    const now = new Date();
    const start = new Date(scheduledStart);
    const diff = start.getTime() - now.getTime();
    
    if (diff < 0) return "Starting soon";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }
    return `In ${minutes} minutes`;
  };

  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "upcoming") return session.status === "scheduled";
    if (activeTab === "live") return session.status === "live";
    if (activeTab === "past") return session.status === "ended";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <StudentHeader userName="" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Live Classes</h1>
              <p className="text-muted-foreground">
                Join your scheduled live classes
              </p>
            </div>
          </div>
        </div>

        {/* Live Now Alert */}
        {sessions.filter((s) => s.status === "live").length > 0 && activeTab !== "live" && (
          <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500 rounded-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400">
                    {sessions.filter((s) => s.status === "live").length} class
                    {sessions.filter((s) => s.status === "live").length > 1 ? "es are" : " is"} LIVE now!
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    Click to join your live classes
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab("live")}
                className="bg-red-600 hover:bg-red-700"
              >
                View Live Classes
              </Button>
            </div>
          </div>
        )}

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
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">
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
            Past Classes
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
            <h3 className="text-xl font-semibold mb-2">No classes found</h3>
            <p className="text-muted-foreground">
              {activeTab === "upcoming" && "You don't have any upcoming live classes"}
              {activeTab === "live" && "No classes are currently live"}
              {activeTab === "past" && "You don't have any past classes"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 hover:shadow-xl transition-all ${
                  session.status === "live" ? "ring-2 ring-red-500 animate-pulse" : ""
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  {session.status === "live" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
                      <Radio className="h-3 w-3" />
                      LIVE NOW
                    </span>
                  ) : session.status === "scheduled" ? (
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                      {getTimeUntilSession(session.scheduled_start)}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                      Ended
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">{session.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {session.classes.name} - {session.classes.subject}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Teacher: {session.users.first_name} {session.users.last_name}
                </p>

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
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === "live" && (
                    <>
                      <Button
                        onClick={() => router.push(`/dashboard/live-session/${session.id}/room`)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Now
                      </Button>
                    </>
                  )}

                  {session.status === "scheduled" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/student/live-classes/${session.id}`)
                      }
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}

                  {session.status === "ended" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/student/live-classes/${session.id}`)
                      }
                      className="flex-1"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Materials
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
