import { SalesReportPage } from "@/components/reports/sales-report-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function ReportsPage() {
  await requirePagePermission(AUTH_PERMISSIONS.REPORTS_READ);
  return <SalesReportPage />;
}
