import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { createCustomerSchema, customerFiltersSchema } from "@/schemas/commerce/customer.schemas";
import { commerceService } from "@/services/commerce";

function getFilters(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  return customerFiltersSchema.parse({
    search: params.get("search") ?? undefined,
    inactiveDays: params.get("inactiveDays") ?? undefined,
    includeNeverPurchased: params.get("includeNeverPurchased") ?? undefined,
    contactableOnly: params.get("contactableOnly") ?? undefined,
    minTotalSpent: params.get("minTotalSpent") ?? undefined,
    maxTotalSpent: params.get("maxTotalSpent") ?? undefined,
    minPurchaseCount: params.get("minPurchaseCount") ?? undefined,
    maxPurchaseCount: params.get("maxPurchaseCount") ?? undefined,
    birthdayMonth: params.get("birthdayMonth") ?? undefined,
    tag: params.get("tag") ?? undefined,
    status: params.get("status") ?? undefined
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_READ);
    const filters = getFilters(request);
    const result = await commerceService.listCustomers(session.user.currentTenantId, filters);

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_WRITE);
    const payload = await request.json();
    const input = createCustomerSchema.parse(payload);
    const customer = await commerceService.createCustomer(session.user.currentTenantId, input);

    return created(customer);
  } catch (error) {
    return errorResponse(error);
  }
}
