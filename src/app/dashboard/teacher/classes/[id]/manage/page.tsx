"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  UserMinus,
  Video,
  MessageSquare,
  FileText,
  Loader2,
  Search,
  Mail,
  Calendar,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ClassMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface ClassData {
  id: string;
  name: string;
  subject: string;
  description: string;
  class_code: string;
}

export default function ManageClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    fetchClassData();
    fetchMembers();
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
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this class?`)) {
      return;
    }

    setRemovingMember(memberId);
    try {
      const response = await fetch(`/api/classes/${classId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== memberId));
      } else {
        alert("Failed to remove member");
      }
    } catch (error) {
      alert("Error removing member");
    } finally {
      setRemovingMember(null);
    }
  };

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.users.first_name} ${member.users.last_name}`.toLowerCase();
    const email = member.users.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const studentMembers = filteredMembers.filter((m) => m.role === "student");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href={`/dashboard/teacher/classes/${classId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Class Details
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{classData?.name}</h1>
          <p className="text-muted-foreground mt-1">
            {classData?.subject} • Class Code: {classData?.class_code}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/dashboard/teacher/live-sessions">
            <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline">
              <Video className="h-6 w-6 text-red-600" />
              <div className="text-center">
                <div className="font-semibold">Start Live Class</div>
                <div className="text-xs text-muted-foreground">Video session with students</div>
              </div>
            </Button>
          </Link>

          <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline" disabled>
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div className="text-center">
              <div className="font-semibold">Send Message</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </Button>

          <Button className="w-full h-auto py-4 flex-col gap-2" variant="outline" disabled>
            <FileText className="h-6 w-6 text-green-600" />
            <div className="text-center">
              <div className="font-semibold">Share Content</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </Button>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Members
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {studentMembers.length} {studentMembers.length === 1 ? "student" : "students"} enrolled
              </p>
            </div>
            <Link href={`/dashboard/teacher/classes/${classId}`}>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Add Students
              </Button>
            </Link>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {studentMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No members found matching your search" : "No students enrolled yet"}
              </p>
              {!searchQuery && (
                <Link href={`/dashboard/teacher/classes/${classId}`}>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Add Students
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {studentMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {member.users.first_name[0]}{member.users.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.users.first_name} {member.users.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.users.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleRemoveMember(
                        member.id,
                        `${member.users.first_name} ${member.users.last_name}`
                      )
                    }
                    disabled={removingMember === member.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    {removingMember === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            Once you delete a class, there is no going back. Please be certain.
          </p>
          <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Class
          </Button>
        </div>
      </div>
    </div>
  );
}