import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { fiscalConfigurationSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_READ);
    return ok(await fiscalService.getOverview(session.user.currentTenantId, session.user.currentBranchId ?? null));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const input = fiscalConfigurationSchema.parse(await request.json());
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    return ok(await fiscalService.saveConfiguration(session.user.currentTenantId, branchId, session.user.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
