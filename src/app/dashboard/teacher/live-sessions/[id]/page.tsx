"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Video,
  ArrowLeft,
  Copy,
  ExternalLink,
  Users,
  Clock,
  Calendar,
  PlayCircle,
  StopCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

interface Session {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  meeting_link: string;
  access_code: string | null;
  class_minutes: string | null;
  topics_covered: string[] | null;
  homework_assigned: string | null;
  homework_due_date: string | null;
  classes: {
    name: string;
    subject: string;
  };
}

interface Attendance {
  id: string;
  status: string;
  joined_at: string | null;
  left_at: string | null;
  duration_minutes: number;
  users: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showMinutesForm, setShowMinutesForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const [minutesData, setMinutesData] = useState({
    classMinutes: "",
    topicsCovered: "",
    homeworkAssigned: "",
    homeworkDueDate: "",
  });

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const [sessionRes, attendanceRes] = await Promise.all([
        fetch(`/api/live-sessions/${sessionId}`),
        fetch(`/api/live-sessions/${sessionId}/attendance`),
      ]);

      const sessionData = await sessionRes.json();
      const attendanceData = await attendanceRes.json();

      setSession(sessionData.session);
      setAttendance(attendanceData.attendance || []);

      // Pre-fill minutes form if data exists
      if (sessionData.session.class_minutes) {
        setMinutesData({
          classMinutes: sessionData.session.class_minutes || "",
          topicsCovered: sessionData.session.topics_covered?.join("\n") || "",
          homeworkAssigned: sessionData.session.homework_assigned || "",
          homeworkDueDate: sessionData.session.homework_due_date || "",
        });
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!confirm("Are you sure you want to start this session now?")) {
      return;
    }

    setStarting(true);
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}/start`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchSessionDetails();
        // Redirect to session room
        router.push(`/dashboard/live-session/${sessionId}/room`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to start session");
      }
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  const handleEndSession = async () => {
    setEnding(true);
    setShowMinutesForm(true);
  };

  const handleSubmitMinutes = async () => {
    setEnding(true);
    try {
      const topicsArray = minutesData.topicsCovered
        .split("\n")
        .filter((t) => t.trim());

      const response = await fetch(`/api/live-sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classMinutes: minutesData.classMinutes,
          topicsCovered: topicsArray,
          homeworkAssigned: minutesData.homeworkAssigned,
          homeworkDueDate: minutesData.homeworkDueDate || null,
        }),
      });

      if (response.ok) {
        await fetchSessionDetails();
        setShowMinutesForm(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to end session");
      }
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session. Please try again.");
    } finally {
      setEnding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "text-green-600 dark:text-green-400";
      case "absent":
        return "text-red-600 dark:text-red-400";
      case "late":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <TeacherHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <TeacherHeader />
        <div className="container mx-auto px-4 py-8">
          <p>Session not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <TeacherHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                  <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium animate-pulse">
                    LIVE
                  </span>
                )}
              </div>

              {session.description && (
                <p className="text-muted-foreground mb-4">{session.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(session.scheduled_start)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(session.scheduled_end).getTime() -
                      new Date(session.scheduled_start).getTime()}{" "}
                    minutes
                  </span>
                </div>
              </div>

              {/* Meeting Link */}
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium mb-2 block">
                  Meeting Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={session.meeting_link}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(session.meeting_link)}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                {session.access_code && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Access Code: <strong>{session.access_code}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {session.status === "scheduled" && (
                <Button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Session...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Session Now
                    </>
                  )}
                </Button>
              )}

              {session.status === "live" && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => router.push(`/dashboard/live-session/${session.id}/room`)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Session
                  </Button>
                  {!showMinutesForm && (
                    <Button
                      onClick={handleEndSession}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      End Session
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Class Minutes Form */}
            {showMinutesForm && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                <h2 className="text-xl font-bold mb-4">Add Class Minutes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Class Notes/Minutes
                    </label>
                    <Textarea
                      value={minutesData.classMinutes}
                      onChange={(e) =>
                        setMinutesData({
                          ...minutesData,
                          classMinutes: e.target.value,
                        })
                      }
                      placeholder="What was covered in this session?"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Topics Covered (one per line)
                    </label>
                    <Textarea
                      value={minutesData.topicsCovered}
                      onChange={(e) =>
                        setMinutesData({
                          ...minutesData,
                          topicsCovered: e.target.value,
                        })
                      }
                      placeholder="Topic 1&#10;Topic 2&#10;Topic 3"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Homework Assigned (Optional)
                    </label>
                    <Textarea
                      value={minutesData.homeworkAssigned}
                      onChange={(e) =>
                        setMinutesData({
                          ...minutesData,
                          homeworkAssigned: e.target.value,
                        })
                      }
                      placeholder="Describe the homework assignment..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Homework Due Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={minutesData.homeworkDueDate}
                      onChange={(e) =>
                        setMinutesData({
                          ...minutesData,
                          homeworkDueDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowMinutesForm(false);
                        setEnding(false);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitMinutes}
                      disabled={ending}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
                    >
                      {ending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & End Session"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Class Materials (After Session Ends) */}
            {session.status === "ended" && session.class_minutes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
                <h2 className="text-xl font-bold mb-4">Class Materials</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Class Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {session.class_minutes}
                    </p>
                  </div>

                  {session.topics_covered && session.topics_covered.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Topics Covered</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {session.topics_covered.map((topic, index) => (
                          <li key={index} className="text-muted-foreground">
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.homework_assigned && (
                    <div>
                      <h3 className="font-medium mb-2">Homework Assignment</h3>
                      <p className="text-muted-foreground">
                        {session.homework_assigned}
                      </p>
                      {session.homework_due_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {formatDate(session.homework_due_date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Attendance */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance
                </h2>
                <span className="text-sm text-muted-foreground">
                  {attendance.filter((a) => a.status === "present").length} /{" "}
                  {attendance.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {attendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {record.users.first_name} {record.users.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.users.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-medium ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {record.status === "present" && <CheckCircle className="h-4 w-4 inline" />}
                        {record.status === "absent" && <XCircle className="h-4 w-4 inline" />}
                        {" "}
                        {record.status}
                      </span>
                      {record.duration_minutes > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {record.duration_minutes} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {session.status === "ended" && (
                <Button variant="outline" className="w-full mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Export Attendance
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
