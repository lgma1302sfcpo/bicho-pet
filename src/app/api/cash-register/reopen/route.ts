import { Prisma } from "@prisma/client";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { reopenCashRegisterSchema } from "@/schemas/cash-register.schemas";

export async function POST(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = reopenCashRegisterSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;

    const result = await prisma.$transaction(async (tx) => {
      const [cashRegister, current] = await Promise.all([
        tx.cashRegisterSession.findFirst({ where: { id: input.cashRegisterId, tenantId, branchId, status: "CLOSED" }, select: { id: true } }),
        tx.cashRegisterSession.findFirst({ where: { tenantId, branchId, status: "OPEN" }, select: { id: true } })
      ]);
      if (!cashRegister) throw new AppError("Este caixa não está disponível para reabertura.", "CASH_REGISTER_NOT_REOPENABLE", 409);
      if (current) throw new AppError("Feche o caixa atual antes de reabrir um caixa anterior.", "CASH_REGISTER_ALREADY_OPEN", 409);

      return tx.cashRegisterSession.update({
        where: { id: cashRegister.id },
        data: {
          status: "OPEN",
          reopenedById: session.user.id,
          reopenedAt: new Date(),
          reopenCount: { increment: 1 },
          closedById: null,
          closedAt: null,
          expectedClosingAmount: null,
          actualClosingAmount: null,
          difference: null,
          closingNotes: null
        },
        select: { id: true, reopenCount: true }
      });
    }, { isolationLevel: "Serializable" });

    return ok(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse(new AppError("Já existe um caixa aberto nesta loja.", "CASH_REGISTER_ALREADY_OPEN", 409));
    }
    return errorResponse(error);
  }
}
