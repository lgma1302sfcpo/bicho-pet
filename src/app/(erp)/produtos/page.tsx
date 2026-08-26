import { ProductManagementPage } from "@/components/products/product-management-page";
import { AUTH_PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/require-page-permission";

export default async function ProductsPage() {
  const session = await requirePagePermission(AUTH_PERMISSIONS.PRODUCTS_READ);
  return <ProductManagementPage canManage={hasPermission(session.user.permissions, AUTH_PERMISSIONS.PRODUCTS_WRITE)} />;
}
