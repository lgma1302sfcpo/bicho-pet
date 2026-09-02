import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { id } = await context.params;
    const result = await prisma.groomingScheduleBlock.deleteMany({ where: { id, tenantId: session.user.currentTenantId, branchId } });
    if (!result.count) throw new AppError("Bloqueio não encontrado.", "GROOMING_BLOCK_NOT_FOUND", 404);
    return ok({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
