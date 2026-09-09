import { SaleCreatePage } from "@/components/sales/sale-create-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function NewSalePage() {
  const session = await requirePagePermission([AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV]);
  return <SaleCreatePage branchName={session.user.currentBranchName ?? "Loja não definida"} />;
}
