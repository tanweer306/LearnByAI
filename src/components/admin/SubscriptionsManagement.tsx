"use client";

import { DollarSign } from "lucide-react";

export default function SubscriptionsManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Subscriptions Management</h2>
        <p className="text-slate-600">Manage pricing plans and subscriptions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
        <div className="text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Subscriptions Management
          </h3>
          <p className="text-slate-600">
            Subscription and pricing management features will be displayed here
          </p>
        </div>
      </div>
    </div>
  );
}
