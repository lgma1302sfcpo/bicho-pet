import { NextRequest } from "next/server";

import { created, errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { issueFiscalDocumentSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let saleId: string | undefined;
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const payload = await request.json();
    saleId = typeof payload?.saleId === "string" ? payload.saleId : undefined;
    const input = issueFiscalDocumentSchema.parse(payload);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    return created(await fiscalService.issue(session.user.currentTenantId, branchId, session.user.id, input));
  } catch (error) {
    if (saleId) {
      await prisma.sale.updateMany({ where: { id: saleId }, data: { fiscalPendingAt: new Date(), fiscalPendingReason: error instanceof Error ? error.message : "A nota precisa de correção." } }).catch(() => undefined);
    }
    return errorResponse(error);
  }
}
