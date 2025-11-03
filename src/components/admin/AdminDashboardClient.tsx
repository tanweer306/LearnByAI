"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  GraduationCap,
  Building2,
  Settings,
  LogOut,
  BarChart3,
  DollarSign,
  MessageSquare,
  Shield,
  Database,
  Zap,
} from "lucide-react";
import { AdminUser } from "@/lib/admin-auth";

// Import sub-components
import UsersManagementCRUD from "./UsersManagementCRUD";
import BooksManagementCRUD from "./BooksManagementCRUD";
import InstitutionsManagementCRUD from "./InstitutionsManagementCRUD";
import SubscriptionsManagementCRUD from "./SubscriptionsManagementCRUD";
import AIPromptsManagementCRUD from "./AIPromptsManagementCRUD";
import SystemSettings from "./SystemSettings";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface AdminDashboardClientProps {
  admin: AdminUser;
}

type TabType =
  | "analytics"
  | "users"
  | "books"
  | "institutions"
  | "subscriptions"
  | "ai-prompts"
  | "settings";

export default function AdminDashboardClient({ admin }: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin-portal/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const tabs = [
    { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
    { id: "users" as TabType, label: "Users", icon: Users },
    { id: "books" as TabType, label: "Books", icon: BookOpen },
    { id: "institutions" as TabType, label: "Institutions", icon: Building2 },
    { id: "subscriptions" as TabType, label: "Subscriptions", icon: DollarSign },
    { id: "ai-prompts" as TabType, label: "AI Prompts", icon: Zap },
    { id: "settings" as TabType, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
                  <p className="text-sm text-slate-500">System Management Dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {admin.full_name || admin.username}
                </p>
                <p className="text-xs text-slate-500">
                  {admin.is_super_admin ? "Super Admin" : "Admin"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-t border-slate-200">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "users" && <UsersManagementCRUD />}
          {activeTab === "books" && <BooksManagementCRUD />}
          {activeTab === "institutions" && <InstitutionsManagementCRUD />}
          {activeTab === "subscriptions" && <SubscriptionsManagementCRUD />}
          {activeTab === "ai-prompts" && <AIPromptsManagementCRUD />}
          {activeTab === "settings" && <SystemSettings admin={admin} />}
        </div>
      </main>
    </div>
  );
}
