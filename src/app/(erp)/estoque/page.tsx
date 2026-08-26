import { InventoryPage } from "@/components/inventory/inventory-page";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function InventoryRoute() { await requirePagePermission(AUTH_PERMISSIONS.INVENTORY_READ); return <InventoryPage />; }
