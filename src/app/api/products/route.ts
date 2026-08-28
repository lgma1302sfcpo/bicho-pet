import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { createProductSchema, productFiltersSchema } from "@/schemas/catalog/product.schemas";
import { productService } from "@/services/catalog";

function getFilters(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  return productFiltersSchema.parse({
    search: params.get("search") ?? undefined,
    category: params.get("category") ?? undefined,
    supplier: params.get("supplier") ?? undefined,
    species: params.get("species") ?? undefined,
    status: params.get("status") ?? undefined,
    lowStockOnly: params.get("lowStockOnly") ?? undefined
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_READ);
    const filters = getFilters(request);
    const result = await productService.listProducts(session.user.currentTenantId, session.user.currentBranchId ?? null, filters);

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_WRITE);
    const payload = await request.json();
    const input = createProductSchema.parse(payload);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const product = await productService.createProduct(session.user.currentTenantId, branchId, input);

    return created(product);
  } catch (error) {
    return errorResponse(error);
  }
}
