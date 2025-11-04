import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DollarSign, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import InstitutionHeader from "@/components/dashboard/InstitutionHeader";

export default async function InstitutionSubscriptionPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!userData || (userData.role !== "admin" && userData.user_type !== "institution")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <InstitutionHeader userName={userData.institution_name || "Institution"} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Subscription & Billing</h1>
          <p className="text-muted-foreground">
            Manage your institution's subscription plan
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Free Plan</h3>
              <p className="text-3xl font-bold mb-1">$0</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 50 students</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">5 teachers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic analytics</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg border-2 border-blue-400 p-6 text-white relative">
            <div className="absolute top-4 right-4 bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">
              POPULAR
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
              <p className="text-3xl font-bold mb-1">$99</p>
              <p className="text-sm opacity-90">per month</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Up to 500 students</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited teachers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Advanced analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Live classes</span>
              </li>
            </ul>
            <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
              Upgrade to Pro
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold mb-1">Custom</p>
              <p className="text-sm text-muted-foreground">contact us</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited students</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited teachers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Custom integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dedicated support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
