import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { productService } from "@/services/catalog";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission([
      AUTH_PERMISSIONS.PRODUCTS_READ,
      AUTH_PERMISSIONS.SALES_WRITE,
      AUTH_PERMISSIONS.SALES_PDV
    ]);
    const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (search.length < 2) return ok([]);

    return ok(await productService.searchProducts(
      session.user.currentTenantId,
      session.user.currentBranchId ?? null,
      search
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
