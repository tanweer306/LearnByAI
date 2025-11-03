"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Video, X } from "lucide-react";

interface Session {
  id: string;
  title: string;
  meeting_link: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  classes: {
    name: string;
  };
}

export default function SessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [meetingToken, setMeetingToken] = useState<string>(""); 

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load session");
      }

      if (data.session.status !== "live") {
        setError("This session is not currently live");
      }

      setSession(data.session);
    } catch (err: any) {
      setError(err.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    setJoining(true);
    try {
      // Mark attendance as present
      await fetch(`/api/live-sessions/${sessionId}/join`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Error marking attendance:", err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveSession = () => {
    if (confirm("Are you sure you want to leave this session?")) {
      router.back();
    }
  };
const fetchMeetingToken = async () => {
  try {
    const response = await fetch(`/api/live-sessions/${sessionId}/token`, {
      method: "POST",
    });
    const data = await response.json();
    if (data.token) {
      setMeetingToken(data.token);
    }
  } catch (err) {
    console.error("Error fetching token:", err);
  }
};
  useEffect(() => {
    if (session && session.status === "live") {
      handleJoinSession();
      fetchMeetingToken();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Unable to Join Session
          </h2>
          <p className="text-gray-400 mb-6">
            {error || "Session not found"}
          </p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-red-500" />
          <div>
            <h1 className="text-white font-semibold text-sm">
              {session.title}
            </h1>
            <p className="text-gray-400 text-xs">{session.classes.name}</p>
          </div>
        </div>
        <Button
          onClick={handleLeaveSession}
          variant="outline"
          size="sm"
          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Leave Session
        </Button>
      </div>

      {/* Daily.co Iframe */}
      <div className="flex-1 relative">
        {joining && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
              <p className="text-white">Joining session...</p>
            </div>
          </div>
        )}
        
        <iframe
           src={`${session.meeting_link}${meetingToken ? `?t=${meetingToken}` : ''}`}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 60px)" }}
        />
      </div>
    </div>
  );
}
