import { SaleCreatePage } from "@/components/sales/sale-create-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function PointOfSaleRoute() { await requirePagePermission(AUTH_PERMISSIONS.SALES_PDV); return <SaleCreatePage />; }
