import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const { isValid, admin } = await verifyAdminSession();

  if (!isValid || !admin) {
    redirect("/admin-portal/login");
  }

  return <AdminDashboardClient admin={admin} />;
}
