import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { sendCustomerEmailSchema } from "@/schemas/messaging/email.schemas";
import { customerEmailService } from "@/services/messaging";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_WRITE);
    const { id } = await context.params;
    const input = sendCustomerEmailSchema.parse(await request.json());
    return ok(await customerEmailService.sendToCustomer(session.user.currentTenantId, session.user.currentBranchId ?? null, id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
