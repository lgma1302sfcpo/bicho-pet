import { OfflineSalesPage } from "@/components/sales/offline-sales-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function OfflineSaleRoute() {
  const session = await requirePagePermission([AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV]);
  return <OfflineSalesPage tenantId={session.user.currentTenantId} branchId={session.user.currentBranchId ?? ""} branchName={session.user.currentBranchName ?? "Loja não definida"} userId={session.user.id} />;
}
