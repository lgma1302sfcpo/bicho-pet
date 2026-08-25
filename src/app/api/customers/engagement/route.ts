import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { customerFiltersSchema } from "@/schemas/commerce/customer.schemas";
import { commerceService } from "@/services/commerce";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_READ);
    const params = request.nextUrl.searchParams;
    const filters = customerFiltersSchema.parse({
      inactiveDays: params.get("inactiveDays") ?? "60",
      includeNeverPurchased: params.get("includeNeverPurchased") ?? "true"
    });
    const result = await commerceService.listCustomers(session.user.currentTenantId, filters);

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
