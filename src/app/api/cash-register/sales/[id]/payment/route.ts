import { Prisma } from "@prisma/client";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { correctSalePaymentSchema } from "@/schemas/cash-register.schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(auth.user.currentBranchId);
    const tenantId = auth.user.currentTenantId;
    const { id } = await context.params;
    const input = correctSalePaymentSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, tenantId, branchId, status: "COMPLETED" },
        include: {
          cashRegisterSession: { select: { id: true, status: true } },
          fiscalDocuments: { where: { status: { in: ["PROCESSING", "CONTINGENCY_PENDING", "AUTHORIZED"] } }, select: { id: true }, take: 1 }
        }
      });
      if (!sale) throw new AppError("Venda não encontrada nesta loja.", "SALE_NOT_FOUND", 404);
      const oldPaymentMethod = sale.paymentMethod;
      const isReceivingStoreCredit = oldPaymentMethod === "STORE_CREDIT" && input.paymentMethod !== "STORE_CREDIT";
      if (!isReceivingStoreCredit && (!sale.cashRegisterSession || sale.cashRegisterSession.status !== "OPEN")) {
        throw new AppError("Reabra o caixa desta venda antes de corrigir o pagamento.", "CASH_REGISTER_CLOSED", 409);
      }
      if (sale.paymentMethod === input.paymentMethod) {
        throw new AppError("Selecione uma forma de pagamento diferente da atual.", "PAYMENT_METHOD_UNCHANGED", 422);
      }
      if (input.paymentMethod === "STORE_CREDIT" && !sale.customerId) {
        throw new AppError("Selecione um cliente na venda antes de alterar para fiado / crediário.", "CUSTOMER_REQUIRED", 422);
      }
      if (sale.fiscalDocuments.length && sale.paymentMethod !== "STORE_CREDIT") {
        throw new AppError("Esta venda possui documento fiscal em processamento ou autorizado. Regularize o documento fiscal antes de alterar o pagamento.", "ACTIVE_FISCAL_DOCUMENT", 409);
      }

      let openSessionForReceipt: { id: string } | null = null;
      if (isReceivingStoreCredit && input.paymentMethod === "CASH") {
        openSessionForReceipt = await tx.cashRegisterSession.findFirst({ where: { tenantId, branchId, status: "OPEN" }, select: { id: true } });
        if (!openSessionForReceipt) throw new AppError("Abra o caixa antes de receber uma venda fiada em dinheiro.", "CASH_REGISTER_NOT_OPEN", 409);
      }

      await tx.sale.update({ where: { id: sale.id }, data: { paymentMethod: input.paymentMethod } });
      await tx.salePayment.deleteMany({ where: { saleId: sale.id } });
      await tx.salePayment.create({ data: { saleId: sale.id, method: input.paymentMethod, amount: sale.total } });
      await tx.financialEntry.updateMany({
        where: { saleId: sale.id, status: { not: "CANCELLED" } },
        data: {
          paymentMethod: input.paymentMethod,
          status: input.paymentMethod === "STORE_CREDIT" ? "PENDING" : "PAID",
          paidAt: input.paymentMethod === "STORE_CREDIT" ? null : new Date()
        }
      });

      if (isReceivingStoreCredit) {
        if (openSessionForReceipt) {
          await tx.cashRegisterMovement.create({
            data: {
              sessionId: openSessionForReceipt.id,
              tenantId,
              branchId,
              userId: auth.user.id,
              saleId: sale.id,
              type: "CASH_SALE",
              amount: sale.total,
              description: `Recebimento fiado ${sale.code}`
            }
          });
        }
      } else if (oldPaymentMethod === "CASH" && input.paymentMethod !== "CASH") {
        await tx.cashRegisterMovement.deleteMany({
          where: {
            sessionId: sale.cashRegisterSession!.id,
            type: "CASH_SALE",
            OR: [{ saleId: sale.id }, { saleId: null, description: `Venda ${sale.code}` }]
          }
        });
      } else if (oldPaymentMethod !== "CASH" && input.paymentMethod === "CASH") {
        await tx.cashRegisterMovement.create({
          data: {
            sessionId: sale.cashRegisterSession!.id,
            tenantId,
            branchId,
            userId: auth.user.id,
            saleId: sale.id,
            type: "CASH_SALE",
            amount: sale.total,
            description: `Venda ${sale.code}`
          }
        });
      }

      const correction = await tx.salePaymentCorrection.create({
        data: {
          tenantId,
          branchId,
          saleId: sale.id,
          correctedById: auth.user.id,
          oldPaymentMethod,
          newPaymentMethod: input.paymentMethod,
          reason: input.reason
        }
      });
      return { saleId: sale.id, paymentMethod: input.paymentMethod, correctionId: correction.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
