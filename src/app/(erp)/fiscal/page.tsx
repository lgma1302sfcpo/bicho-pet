import { FiscalManagementPage } from "@/components/fiscal/fiscal-management-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function FiscalPage() {
  await requirePagePermission(AUTH_PERMISSIONS.FISCAL_READ);
  return <FiscalManagementPage />;
}
