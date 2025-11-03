"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, GraduationCap, Building2, DollarSign, TrendingUp } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalInstitutions: number;
  totalBooks: number;
  activeSubscriptions: number;
  totalRevenue: number;
  newUsersThisMonth: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/analytics/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "bg-blue-500",
      change: `+${stats?.newUsersThisMonth || 0} this month`,
    },
    {
      title: "Students",
      value: stats?.totalStudents || 0,
      icon: GraduationCap,
      color: "bg-green-500",
    },
    {
      title: "Teachers",
      value: stats?.totalTeachers || 0,
      icon: Users,
      color: "bg-purple-500",
    },
    {
      title: "Institutions",
      value: stats?.totalInstitutions || 0,
      icon: Building2,
      color: "bg-orange-500",
    },
    {
      title: "Total Books",
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      color: "bg-pink-500",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: TrendingUp,
      color: "bg-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Platform Analytics</h2>
        <p className="text-slate-600">Overview of platform statistics and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
                  {card.change && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {card.change}
                    </p>
                  )}
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <p className="text-slate-600 text-center py-8">
            Activity tracking will be displayed here
          </p>
        </div>
      </div>
    </div>
  );
}
