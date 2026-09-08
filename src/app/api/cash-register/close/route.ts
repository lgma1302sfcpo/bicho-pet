import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { calculateCashDifference, calculateExpectedCash } from "@/lib/cash-register";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { closeCashRegisterSchema } from "@/schemas/cash-register.schemas";

export async function POST(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = closeCashRegisterSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const cashRegister = await tx.cashRegisterSession.findFirst({
        where: { tenantId: session.user.currentTenantId, branchId, status: "OPEN" },
        include: { movements: { select: { type: true, amount: true } }, sales: { select: { paymentMethod: true, total: true, payments: { select: { method: true, amount: true } } } } }
      });
      if (!cashRegister) throw new AppError("Não existe um caixa aberto nesta loja.", "CASH_REGISTER_NOT_OPEN", 409);

      const totals = cashRegister.movements.reduce((acc, movement) => {
        const amount = Number(movement.amount);
        if (movement.type === "SUPPLY") acc.supplies += amount;
        if (movement.type === "WITHDRAWAL") acc.withdrawals += amount;
        return acc;
      }, { cashSales: 0, supplies: 0, withdrawals: 0 });
      totals.cashSales = cashRegister.sales.reduce((total, sale) => {
        if (sale.payments.length) return total + sale.payments.reduce((sum, payment) => payment.method === "CASH" ? sum + Number(payment.amount) : sum, 0);
        return sale.paymentMethod === "CASH" ? total + Number(sale.total) : total;
      }, 0);
      const expectedAmount = calculateExpectedCash(Number(cashRegister.openingAmount), totals);
      const difference = calculateCashDifference(input.actualAmount, expectedAmount);

      const closed = await tx.cashRegisterSession.updateMany({
        where: { id: cashRegister.id, status: "OPEN" },
        data: {
          status: "CLOSED",
          closedById: session.user.id,
          closedAt: new Date(),
          expectedClosingAmount: expectedAmount,
          actualClosingAmount: input.actualAmount,
          difference,
          closingNotes: input.notes || null
        }
      });
      if (closed.count !== 1) throw new AppError("Este caixa já foi fechado.", "CASH_REGISTER_ALREADY_CLOSED", 409);
      return { id: cashRegister.id, expectedAmount, actualAmount: input.actualAmount, difference };
    }, { isolationLevel: "Serializable" });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
