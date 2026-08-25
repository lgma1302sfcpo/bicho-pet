import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { updateProductSchema } from "@/schemas/catalog/product.schemas";
import { productService } from "@/services/catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_WRITE);
    const { id } = await context.params;
    const input = updateProductSchema.parse(await request.json());
    return ok(await productService.updateProduct(session.user.currentTenantId, id, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_WRITE);
    const { id } = await context.params;
    await productService.deleteProduct(session.user.currentTenantId, id);
    return ok({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
