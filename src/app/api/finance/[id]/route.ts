import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { financialStatusSchema } from "@/schemas/operations.schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FINANCE_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { id } = await context.params;
    const input = financialStatusSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.financialEntry.findFirst({
        where: { id, tenantId: session.user.currentTenantId, branchId },
        include: { sale: { select: { id: true, code: true } } }
      });
      if (!entry) return null;

      const paymentMethod = input.status === "PAID" ? input.paymentMethod ?? entry.paymentMethod : entry.paymentMethod;
      const paidAt = input.status === "PAID" ? new Date() : null;
      const shouldEnterCashRegister =
        entry.status === "PENDING" &&
        input.status === "PAID" &&
        entry.type === "REVENUE" &&
        entry.paymentMethod === "STORE_CREDIT" &&
        paymentMethod === "CASH";

      let cashRegisterId: string | null = null;
      if (shouldEnterCashRegister) {
        const cashRegister = await tx.cashRegisterSession.findFirst({
          where: { tenantId: session.user.currentTenantId, branchId, status: "OPEN" },
          select: { id: true }
        });
        if (!cashRegister) {
          throw new AppError("Abra o caixa antes de receber uma venda fiada em dinheiro.", "CASH_REGISTER_NOT_OPEN", 409);
        }
        cashRegisterId = cashRegister.id;
      }

      await tx.financialEntry.update({
        where: { id: entry.id },
        data: { status: input.status, paidAt, paymentMethod }
      });

      if (cashRegisterId) {
        await tx.cashRegisterMovement.create({
          data: {
            sessionId: cashRegisterId,
            tenantId: session.user.currentTenantId,
            branchId,
            userId: session.user.id,
            saleId: entry.saleId,
            type: "CASH_SALE",
            amount: entry.amount,
            description: `Recebimento fiado${entry.sale?.code ? ` ${entry.sale.code}` : ""}`
          }
        });
      }

      return entry;
    });

    if (!result) throw new AppError("Lancamento financeiro nao encontrado.", "FINANCIAL_ENTRY_NOT_FOUND", 404);
    return ok({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FINANCE_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { id } = await context.params;
    const result = await prisma.financialEntry.deleteMany({ where: { id, tenantId: session.user.currentTenantId, branchId, saleId: null } });
    if (!result.count) throw new AppError("Lancamento nao encontrado ou gerado por uma venda.", "FINANCIAL_ENTRY_NOT_DELETABLE", 422);
    return ok({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
