import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalConfigurationSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_READ);
    return ok(await fiscalService.getOverview(session.user.currentTenantId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const input = fiscalConfigurationSchema.parse(await request.json());
    return ok(await fiscalService.saveConfiguration(session.user.currentTenantId, session.user.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
