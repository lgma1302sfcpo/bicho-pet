import { z } from "zod";

import { errorResponse, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

const assignBranchSchema = z.object({ branchId: z.string().min(1) });

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_WRITE);
    if (!session.user.canAccessAllBranches) {
      throw new AppError("Somente o administrador pode definir a loja de um cliente.", "BRANCH_ACCESS_DENIED", 403);
    }

    const { id } = await context.params;
    const input = assignBranchSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, tenantId, status: "ACTIVE" },
      select: { id: true, name: true }
    });
    if (!branch) {
      throw new AppError("Loja inválida.", "BRANCH_NOT_FOUND", 404);
    }

    const updated = await prisma.customer.updateMany({
      where: { id, tenantId },
      data: { branchId: branch.id }
    });
    if (!updated.count) {
      throw new AppError("Cliente não encontrado.", "CUSTOMER_NOT_FOUND", 404);
    }

    return ok({ customerId: id, branchId: branch.id, branchName: branch.name });
  } catch (error) {
    return errorResponse(error);
  }
}
