import { Prisma } from "@prisma/client";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { cancelSaleSchema } from "@/schemas/cash-register.schemas";

type Context = { params: Promise<{ id: string }> };
const number = (value: unknown) => Number(value ?? 0);

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requirePermission(AUTH_PERMISSIONS.CASH_WRITE);
    const branchId = requireSelectedBranch(auth.user.currentBranchId);
    const tenantId = auth.user.currentTenantId;
    const { id } = await context.params;
    const input = cancelSaleSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, tenantId, branchId },
        include: {
          cashRegisterSession: { select: { id: true, status: true } },
          items: { select: { productId: true, quantity: true } },
          fiscalDocuments: { where: { status: { in: ["PROCESSING", "CONTINGENCY_PENDING", "AUTHORIZED"] } }, select: { id: true }, take: 1 }
        }
      });
      if (!sale) throw new AppError("Venda não encontrada nesta loja.", "SALE_NOT_FOUND", 404);
      if (sale.status === "CANCELLED") throw new AppError("Esta venda já foi cancelada.", "SALE_ALREADY_CANCELLED", 409);
      if (sale.status !== "COMPLETED") throw new AppError("Esta venda não pode ser cancelada.", "SALE_NOT_CANCELLABLE", 409);
      if (!sale.cashRegisterSession || sale.cashRegisterSession.status !== "OPEN") {
        throw new AppError("Reabra o caixa desta venda antes de cancelá-la.", "CASH_REGISTER_CLOSED", 409);
      }
      if (sale.fiscalDocuments.length) {
        throw new AppError("Esta venda possui documento fiscal em processamento ou autorizado. Regularize o documento fiscal antes de cancelar a venda.", "ACTIVE_FISCAL_DOCUMENT", 409);
      }

      const quantitiesByProduct = new Map<string, number>();
      for (const item of sale.items) {
        if (item.productId) quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + number(item.quantity));
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const stock = await tx.productBranchStock.findUnique({
          where: { branchId_productId: { branchId, productId } },
          select: { stockQuantity: true }
        });
        const previousBalance = number(stock?.stockQuantity);
        if (stock) {
          await tx.productBranchStock.update({ where: { branchId_productId: { branchId, productId } }, data: { stockQuantity: { increment: quantity } } });
        } else {
          await tx.productBranchStock.create({ data: { tenantId, branchId, productId, stockQuantity: quantity } });
        }
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            branchId,
            productId,
            userId: auth.user.id,
            type: "ENTRY",
            quantity,
            previousBalance,
            newBalance: previousBalance + quantity,
            reason: "Cancelamento de venda",
            reference: sale.code
          }
        });
      }

      const cancelledAt = new Date();
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "CANCELLED", cancelledAt, cancelledById: auth.user.id, cancellationReason: input.reason }
      });
      await tx.cashRegisterMovement.deleteMany({
        where: {
          sessionId: sale.cashRegisterSession.id,
          type: "CASH_SALE",
          OR: [{ saleId: sale.id }, { saleId: null, description: `Venda ${sale.code}` }]
        }
      });
      await tx.financialEntry.updateMany({ where: { saleId: sale.id }, data: { status: "CANCELLED", paidAt: null } });

      if (sale.customerId) {
        const summary = await tx.sale.aggregate({
          where: { tenantId, branchId, customerId: sale.customerId, status: "COMPLETED" },
          _count: { _all: true },
          _sum: { total: true },
          _min: { soldAt: true },
          _max: { soldAt: true }
        });
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            purchaseCount: summary._count._all,
            totalSpent: number(summary._sum.total),
            firstPurchaseAt: summary._min.soldAt,
            lastPurchaseAt: summary._max.soldAt
          }
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: auth.user.id,
          action: "SALE_CANCELLED",
          entity: "Sale",
          entityId: sale.id,
          metadata: { code: sale.code, reason: input.reason, total: number(sale.total), paymentMethod: sale.paymentMethod }
        }
      });

      return { saleId: sale.id, code: sale.code, status: "CANCELLED", cancelledAt: cancelledAt.toISOString() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
