"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Building2 } from "lucide-react";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default function InstitutionSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    institutionName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  });

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement save functionality
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <InstitutionHeader institutionName="Institution" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your institution's profile and preferences
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#99CE79] to-[#7AB85C] rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Institution Profile</h2>
              <p className="text-sm text-muted-foreground">
                Update your institution's information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Institution Name *
              </label>
              <Input
                value={formData.institutionName}
                onChange={(e) =>
                  setFormData({ ...formData, institutionName: e.target.value })
                }
                placeholder="e.g., Springfield High School"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Address
              </label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Full address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@institution.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://www.institution.edu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Tell us about your institution..."
                rows={4}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-[#99CE79] to-[#7AB85C]"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
