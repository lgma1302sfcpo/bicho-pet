import { Prisma } from "@prisma/client";

import { created, errorResponse } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { openCashRegisterSchema } from "@/schemas/cash-register.schemas";

export async function POST(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = openCashRegisterSchema.parse(await request.json());
    const cashRegister = await prisma.cashRegisterSession.create({
      data: {
        tenantId: session.user.currentTenantId,
        branchId,
        openedById: session.user.id,
        openingAmount: input.openingAmount,
        openingNotes: input.notes || null
      },
      select: { id: true }
    });
    return created(cashRegister);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um caixa aberto nesta loja.", "CASH_REGISTER_ALREADY_OPEN", 409));
    }
    return errorResponse(error);
  }
}

