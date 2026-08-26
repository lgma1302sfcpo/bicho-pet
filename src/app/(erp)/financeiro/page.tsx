import { FinancePage } from "@/components/finance/finance-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function FinanceRoute() { await requirePagePermission(AUTH_PERMISSIONS.FINANCE_READ); return <FinancePage />; }
