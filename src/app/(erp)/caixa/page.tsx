import { CashRegisterPage } from "@/components/cash-register/cash-register-page";
import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function CashRegisterRoute() {
  const session = await requirePagePermission(AUTH_PERMISSIONS.CASH_READ);
  return <CashRegisterPage canManage={hasPermission(session.user.permissions, AUTH_PERMISSIONS.CASH_WRITE)} />;
}
