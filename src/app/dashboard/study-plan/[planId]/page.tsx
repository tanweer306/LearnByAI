/**
 * Study Plan Details Page
 * View and manage study plan with task timeline
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  Circle,
  ArrowLeft,
  Target,
  Clock,
  BookOpen,
  Calendar,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface Task {
  id: string;
  task_type: string;
  title: string;
  description: string;
  due_date: string;
  estimated_minutes: number;
  completed: boolean;
  completed_at: string | null;
  content_reference: string | null;
}

interface StudyPlan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  book: { title: string };
  totalTasks: number;
  completedTasks: number;
  progress: number;
  createdAt: string;
}

export default function StudyPlanPage({ params }: { params: { planId: string } }) {
  const { user } = useUser();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/study-plan/${params.planId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch study plan");
      }

      setPlan(data.plan);
      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error("Error fetching study plan:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTask(taskId);
      const response = await fetch(`/api/study-plan/${params.planId}/toggle-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchPlan(); // Refresh data
      }
    } catch (err) {
      console.error("Error completing task:", err);
    } finally {
      setCompletingTask(null);
    }
  };
  
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'quiz': return '📝';
      case 'review': return '🔄';
      case 'practice': return '✏️';
      default: return '📌';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };
  
  // Group tasks by week
  const tasksByWeek = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const date = new Date(task.due_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, []);
      }
      grouped.get(weekKey)!.push(task);
    });
    
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);
  
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'pending': return tasks.filter(t => !t.completed);
      case 'completed': return tasks.filter(t => t.completed);
      default: return tasks;
    }
  }, [tasks, filter]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader userName={user?.firstName || "User"} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#99CE79]" />
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/study-plan">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Study Plans
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{plan.title}</h1>
              <p className="text-lg text-muted-foreground mb-2">
                {plan.description || plan.book.title}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {plan.book.title}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {plan.totalTasks} tasks
                </span>
              </div>
            </div>
            <Badge className={getStatusColor(plan.status)}>
              {plan.status}
            </Badge>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#99CE79]" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {plan.completedTasks} of {plan.totalTasks} tasks completed
                  </span>
                  <span className="text-sm font-medium">{plan.progress}%</span>
                </div>
                <Progress value={plan.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#99CE79]">
                    {tasks.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#99CE79]">
                    {tasks.filter(t => !t.completed).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#99CE79]">
                    {Math.round(tasks.reduce((sum, t) => sum + t.estimated_minutes, 0) / 60)}h
                  </p>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All Tasks ({tasks.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending ({tasks.filter(t => !t.completed).length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            size="sm"
          >
            Completed ({tasks.filter(t => t.completed).length})
          </Button>
        </div>

        {/* Task Timeline */}
        <div className="space-y-6">
          {tasksByWeek.map(([weekStart, weekTasks]) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekTasksFiltered = weekTasks.filter(task => 
              filter === 'all' || 
              (filter === 'pending' && !task.completed) ||
              (filter === 'completed' && task.completed)
            );
            
            if (weekTasksFiltered.length === 0) return null;
            
            return (
              <Card key={weekStart}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>
                      Week of {new Date(weekStart).toLocaleDateString()}
                    </span>
                    <Badge variant="outline">
                      {weekTasksFiltered.filter(t => t.completed).length}/{weekTasksFiltered.length} completed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weekTasksFiltered.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg transition-all ${
                          task.completed
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : "bg-card hover:bg-accent/50"
                        }`}
                      >
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completingTask === task.id}
                          className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                            task.completed
                              ? 'bg-[#99CE79] border-[#99CE79]'
                              : 'border-gray-300 hover:border-[#99CE79]'
                          } ${completingTask === task.id ? 'opacity-50' : ''}`}
                        >
                          {task.completed && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                              <h5 className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </h5>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.task_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_minutes} min
                            </span>
                            {task.completed_at && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Completed {new Date(task.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredTasks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground">
                  {filter === 'pending' ? 'All tasks are completed!' : 'Try a different filter'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
