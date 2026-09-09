import { z } from "zod";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";

const dismissPendingSchema = z.object({
  reason: z.string().trim().min(5, "Informe um motivo com pelo menos 5 caracteres.").max(255)
});

export async function POST(request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { saleId } = await params;
    const input = dismissPendingSchema.parse(await request.json());
    return ok(await fiscalService.dismissPendingSale(session.user.currentTenantId, branchId, session.user.id, saleId, input.reason));
  } catch (error) {
    return errorResponse(error);
  }
}
