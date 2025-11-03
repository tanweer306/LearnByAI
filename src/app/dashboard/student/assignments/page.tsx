"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle, AlertCircle, FileText } from "lucide-react";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/assignments/student');
      const data = await response.json();
      if (data.success) {
        setAssignments(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Not Started' },
      submitted: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Submitted' },
      graded: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Graded' },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();

  const filteredAssignments = assignments.filter(sub => {
    if (filter === 'all') return true;
    if (filter === 'pending') return sub.status === 'draft';
    if (filter === 'submitted') return sub.status === 'submitted';
    if (filter === 'graded') return sub.status === 'graded';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
          <p className="text-muted-foreground">View and complete your assignments</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {[{ key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'submitted', label: 'Submitted' }, { key: 'graded', label: 'Graded' }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {tab.key === 'all' ? assignments.length : assignments.filter(s => {
                  if (tab.key === 'pending') return s.status === 'draft';
                  if (tab.key === 'submitted') return s.status === 'submitted';
                  if (tab.key === 'graded') return s.status === 'graded';
                  return false;
                }).length}
              </span>
            </button>
          ))}
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No assignments found</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'all' ? 'You have no assignments yet' : `No ${filter} assignments`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((submission) => {
              const assignment = submission.assignments;
              const pastDue = isPastDue(assignment.due_date);
              const className = assignment.assignment_classes?.[0]?.classes?.name || 'Assignment';

              return (
                <Link
                  key={submission.id}
                  href={`/dashboard/student/assignments/${assignment.id}`}
                  className="block"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{assignment.title}</h3>
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{className}</p>
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={pastDue && submission.status === 'draft' ? 'text-red-600 font-medium' : ''}>
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        {pastDue && submission.status === 'draft' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.total_points} points</span>
                      </div>
                      {submission.status === 'graded' && submission.score !== null && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Score: {submission.score}/{assignment.total_points}
                          </span>
                        </div>
                      )}
                    </div>

                    {submission.status === 'draft' && (
                      <div className="mt-4">
                        <Button size="sm" className="w-full sm:w-auto">
                          {pastDue ? 'View Assignment' : 'Start Assignment'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}