import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { productService } from "@/services/catalog";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requirePermission([AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV]);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const [catalog, cashRegister] = await Promise.all([
      productService.listProducts(session.user.currentTenantId, branchId, { status: "ACTIVE", lowStockOnly: false }),
      prisma.cashRegisterSession.findFirst({ where: { tenantId: session.user.currentTenantId, branchId, status: "OPEN" }, select: { id: true } })
    ]);
    return ok({ cashRegisterSessionId: cashRegister?.id ?? null, products: catalog.products.map(({ id, name, code, sku, barcode, salePrice, stockQuantity, unit, status }) => ({ id, name, code, sku, barcode, salePrice, stockQuantity, unit, status })) });
  } catch (error) { return errorResponse(error); }
}
