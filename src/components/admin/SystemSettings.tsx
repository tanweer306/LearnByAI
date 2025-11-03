"use client";

import { Settings, Shield } from "lucide-react";
import { AdminUser } from "@/lib/admin-auth";

interface SystemSettingsProps {
  admin: AdminUser;
}

export default function SystemSettings({ admin }: SystemSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">System Settings</h2>
        <p className="text-slate-600">Configure system-wide settings and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Admin Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm text-slate-600">Username</p>
              <p className="font-medium text-slate-900">{admin.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium text-slate-900">{admin.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm text-slate-600">Role</p>
              <p className="font-medium text-slate-900">
                {admin.is_super_admin ? "Super Admin" : "Admin"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
        <div className="text-center">
          <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            System Configuration
          </h3>
          <p className="text-slate-600">
            System settings and configuration options will be displayed here
          </p>
        </div>
      </div>
    </div>
  );
}
