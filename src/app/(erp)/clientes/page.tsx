import { CustomerEngagementPage } from "@/components/customers/customer-engagement-page";
import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function CustomersPage() {
  const session = await requirePagePermission(AUTH_PERMISSIONS.CUSTOMERS_READ);
  return <CustomerEngagementPage canManage={hasPermission(session.user.permissions, AUTH_PERMISSIONS.CUSTOMERS_WRITE)} />;
}
