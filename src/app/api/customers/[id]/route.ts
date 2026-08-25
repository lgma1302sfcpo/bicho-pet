import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { updateCustomerSchema } from "@/schemas/commerce/customer.schemas";
import { commerceService } from "@/services/commerce";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_WRITE);
    const { id } = await context.params;
    const input = updateCustomerSchema.parse(await request.json());
    return ok(await commerceService.updateCustomer(session.user.currentTenantId, id, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_WRITE);
    const { id } = await context.params;
    await commerceService.deleteCustomer(session.user.currentTenantId, id);
    return ok({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
