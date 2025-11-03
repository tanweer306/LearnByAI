"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";

export default function JoinClassPage({
  params,
}: {
  params: { code: string };
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [className, setClassName] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Redirect to sign in with return URL
      router.push(`/sign-in?redirect_url=/join-class/${params.code}`);
      return;
    }

    if (isLoaded && isSignedIn) {
      joinClass();
    }
  }, [isLoaded, isSignedIn]);

  const joinClass = async () => {
    try {
      const response = await fetch(`/api/classes/join/${params.code}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setClassName(data.className || "the class");
        setMessage("You have successfully joined the class!");
        
        // Redirect to student dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard/student");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to join class");
      }
    } catch (error) {
      console.error("Error joining class:", error);
      setStatus("error");
      setMessage("An error occurred while joining the class");
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-2">Joining Class...</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we add you to the class
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
              Success!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
            {className && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">{className}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">
              Failed to Join
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/dashboard/student")}
                variant="outline"
                className="flex-1"
              >
                Go to Dashboard
              </Button>
              <Button onClick={joinClass} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}