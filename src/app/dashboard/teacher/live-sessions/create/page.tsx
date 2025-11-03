"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Video,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

interface Class {
  id: string;
  name: string;
  subject: string;
  grade_level: string;
}

export default function CreateLiveSessionPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Generate default start time (next hour)
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  // Generate default end time (1 hour after start)
  const getDefaultEndTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    classId: "",
    title: "",
    description: "",
    scheduledStart: getDefaultStartTime(),
    scheduledEnd: getDefaultEndTime(),
    meetingPlatform: "daily",
    accessCode: "",
    maxParticipants: 50,
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes/my-classes");
      const data = await response.json();
      setClasses(data.classes || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError("Failed to load your classes");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate dates
      const start = new Date(formData.scheduledStart);
      const end = new Date(formData.scheduledEnd);

      if (end <= start) {
        setError("End time must be after start time");
        setLoading(false);
        return;
      }

      if (start < new Date()) {
        setError("Start time must be in the future");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/live-sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/teacher/live-sessions/${data.session.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <TeacherHeader />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create Live Session</h1>
              <p className="text-muted-foreground">
                Schedule a live class for your students
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-3">
            <div className="text-green-500">✓</div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Session created successfully!
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Redirecting to session details...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
          {loadingClasses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Class *
                </label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-muted rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.subject}
                      {cls.grade_level && ` (Grade ${cls.grade_level})`}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No classes found. Create a class first.
                  </p>
                )}
              </div>

              {/* Session Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Title *
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Introduction to Algebra"
                  required
                  className="w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What will you cover in this session?"
                  rows={4}
                  className="w-full"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Start Date & Time *
                  </label>
                  <Input
                    type="datetime-local"
                    name="scheduledStart"
                    value={formData.scheduledStart}
                    onChange={handleChange}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    End Date & Time *
                  </label>
                  <Input
                    type="datetime-local"
                    name="scheduledEnd"
                    value={formData.scheduledEnd}
                    onChange={handleChange}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Meeting Platform */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Meeting Platform
                </label>
                <select
                  name="meetingPlatform"
                  value={formData.meetingPlatform}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="daily">Daily.co (Recommended)</option>
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="custom">Custom Link</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.meetingPlatform === "daily"
                    ? "A meeting room will be automatically created for you"
                    : "You'll need to provide the meeting link"}
                </p>
              </div>

              {/* Access Code (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Access Code (Optional)
                </label>
                <Input
                  name="accessCode"
                  value={formData.accessCode}
                  onChange={handleChange}
                  placeholder="Leave empty for no passcode"
                  className="w-full"
                />
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Maximum Participants
                </label>
                <Input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min={1}
                  max={100}
                  className="w-full"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || classes.length === 0}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Create Live Session
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
            📋 What happens next?
          </h3>
          <ul className="text-sm text-blue-600 dark:text-blue-500 space-y-1">
            <li>• All enrolled students will be notified via email</li>
            <li>• Students will see the session on their dashboard</li>
            <li>• You can start the session when it's time</li>
            <li>• Attendance will be tracked automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
