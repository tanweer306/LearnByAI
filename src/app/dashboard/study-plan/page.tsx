/**
 * Study Plan List Page
 * View all study plans with progress tracking
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Eye,
} from "lucide-react";
import Link from "next/link";
import StudentHeader from "@/components/dashboard/StudentHeader";

interface StudyPlan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  status: string;
  book: { title: string };
  createdAt: string;
  progress: number;
}

interface Task {
  id: string;
  task_type: string;
  title: string;
  description: string;
  due_date: string;
  estimated_minutes: number;
  completed: boolean;
  study_plans: {
    id: string;
    title: string;
  };
}

interface Streak {
  current_streak: number;
  longest_streak: number;
}

export default function StudyPlanListPage() {
  const { user } = useUser();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState<Streak>({ current_streak: 0, longest_streak: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/study-plan/list");
      const data = await response.json();
      setPlans(data.plans || []);
      setTodaysTasks(data.todaysTasks || []);
      setStreak(data.streak || { current_streak: 0, longest_streak: 0 });
    } catch (err) {
      console.error("Error fetching study plans:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteTask = async (taskId: string, planId: string) => {
    try {
      setCompletingTask(taskId);
      const response = await fetch(`/api/study-plan/${planId}/toggle-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update streak if returned
        if (data.streak) {
          setStreak(data.streak);
        }
        // Refresh data
        fetchPlans();
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

  const getFilteredPlans = () => {
    switch (filter) {
      case "active":
        return plans.filter((p) => p.status === "active");
      case "completed":
        return plans.filter((p) => p.status === "completed");
      default:
        return plans;
    }
  };

  const getAverageProgress = () => {
    if (plans.length === 0) return 0;
    const sum = plans.reduce((acc, p) => acc + p.progress, 0);
    return sum / plans.length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "paused":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredPlans = getFilteredPlans();

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

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader userName={user?.firstName || "User"} />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] bg-clip-text text-transparent">
                  My Study Plans
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Track your learning journey and stay on schedule
              </p>
            </div>
            <Link href="/dashboard/study-plan/generate">
              <Button className="bg-gradient-to-r from-purple-700 to-purple-900 dark:from-[#99CE79] dark:to-[#E2FED3] dark:text-gray-900">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Study Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {plans.filter((p) => p.status === "active").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasks Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todaysTasks.filter(t => t.completed).length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                🔥 {streak.current_streak}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Longest: {streak.longest_streak} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {plans.length > 0 ? getAverageProgress().toFixed(0) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Today's Tasks */}
        {todaysTasks.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#99CE79]" />
                Today's Tasks
              </CardTitle>
              <CardDescription>
                Complete your daily tasks to maintain your streak
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleCompleteTask(task.id, task.study_plans.id)}
                        disabled={completingTask === task.id}
                        className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
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
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTaskTypeIcon(task.task_type)}</span>
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {task.study_plans.title} • {task.estimated_minutes} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All ({plans.length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            size="sm"
          >
            Active ({plans.filter((p) => p.status === "active").length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            size="sm"
          >
            Completed ({plans.filter((p) => p.status === "completed").length})
          </Button>
        </div>

        {/* Study Plan List */}
        {filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === "all"
                  ? "No study plans yet"
                  : filter === "active"
                    ? "No active study plans"
                    : "No completed study plans"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === "all"
                  ? "Create your first AI-powered study plan to get started"
                  : "Try different filters to see your study plans"}
              </p>
              {filter === "all" && (
                <Link href="/dashboard/study-plan/generate">
                  <Button>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Study Plan
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {plan.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {plan.description || plan.book.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium">
                        {plan.completedTasks}/{plan.totalTasks} tasks
                      </span>
                    </div>
                    <Progress value={plan.progress} className="h-2" />
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="line-clamp-1">{plan.book.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>{plan.totalTasks} tasks</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={`/dashboard/study-plan/${plan.id}`}>
                    <Button className="w-full" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Plan
                    </Button>
                  </Link>

                  <div className="text-xs text-muted-foreground">
                    Created {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
