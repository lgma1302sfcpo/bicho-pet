import { GroomingSchedulePage } from "@/components/grooming/grooming-schedule-page";
import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function GroomingScheduleRoute() {
  const session = await requirePagePermission(AUTH_PERMISSIONS.GROOMING_READ);
  return <GroomingSchedulePage canManage={hasPermission(session.user.permissions, AUTH_PERMISSIONS.GROOMING_WRITE)} canManageCustomers={hasPermission(session.user.permissions, AUTH_PERMISSIONS.CUSTOMERS_WRITE)} />;
}
