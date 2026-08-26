import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function DashboardPage() {
  await requirePagePermission(AUTH_PERMISSIONS.DASHBOARD_READ);
  return <DashboardOverview />;
}
