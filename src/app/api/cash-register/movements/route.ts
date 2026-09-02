import { created, errorResponse } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { cashMovementSchema } from "@/schemas/cash-register.schemas";

export async function POST(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = cashMovementSchema.parse(await request.json());
    const cashRegister = await prisma.cashRegisterSession.findFirst({
      where: { tenantId: session.user.currentTenantId, branchId, status: "OPEN" },
      select: { id: true }
    });
    if (!cashRegister) throw new AppError("Abra o caixa antes de registrar uma movimentação.", "CASH_REGISTER_NOT_OPEN", 409);

    const movement = await prisma.cashRegisterMovement.create({
      data: {
        sessionId: cashRegister.id,
        tenantId: session.user.currentTenantId,
        branchId,
        userId: session.user.id,
        type: input.type,
        amount: input.amount,
        description: input.description
      },
      select: { id: true }
    });
    return created(movement);
  } catch (error) {
    return errorResponse(error);
  }
}

