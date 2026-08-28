import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";
import { commerceService } from "@/services/commerce";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.SALES_READ);
    const sales = await commerceService.listSales(session.user.currentTenantId, session.user.currentBranchId ?? null);

    return ok(sales);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission([AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV]);
    const payload = await request.json();
    const input = createSaleSchema.parse(payload);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const sale = await commerceService.createSale(session.user.currentTenantId, branchId, session.user.id, input);

    return created(sale);
  } catch (error) {
    return errorResponse(error);
  }
}
