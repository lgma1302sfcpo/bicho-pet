import { PaymentMethod } from "@prisma/client";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

type Context = { params: Promise<{ id: string }> };
const number = (value: unknown) => Number(value ?? 0);

export async function GET(request: Request, context: Context) {
  try {
    const auth = await requirePermission(AUTH_PERMISSIONS.CASH_READ);
    const branchId = requireSelectedBranch(auth.user.currentBranchId);
    const { id } = await context.params;
    const requestedMethod = new URL(request.url).searchParams.get("paymentMethod");
    const paymentMethod = requestedMethod && Object.values(PaymentMethod).includes(requestedMethod as PaymentMethod)
      ? requestedMethod as PaymentMethod
      : undefined;

    const cashRegister = await prisma.cashRegisterSession.findFirst({
      where: { id, tenantId: auth.user.currentTenantId, branchId },
      select: { id: true, status: true }
    });
    if (!cashRegister) throw new AppError("Caixa não encontrado nesta loja.", "CASH_REGISTER_NOT_FOUND", 404);

    const sales = await prisma.sale.findMany({
      where: { tenantId: auth.user.currentTenantId, branchId, cashRegisterSessionId: id, status: "COMPLETED", ...(paymentMethod ? { paymentMethod } : {}) },
      orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true } },
        items: { include: { product: { select: { unit: true } } }, orderBy: { createdAt: "asc" } },
        paymentCorrections: { include: { correctedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } }
      }
    });

    return ok({
      cashRegisterId: cashRegister.id,
      status: cashRegister.status,
      total: sales.reduce((sum, sale) => sum + number(sale.total), 0),
      sales: sales.map((sale) => ({
        id: sale.id,
        code: sale.code,
        soldAt: sale.soldAt.toISOString(),
        paymentMethod: sale.paymentMethod,
        subtotal: number(sale.subtotal),
        discount: number(sale.discount),
        surcharge: number(sale.surcharge),
        total: number(sale.total),
        notes: sale.notes,
        customerName: sale.customer?.name ?? null,
        userName: sale.user?.name ?? null,
        items: sale.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: number(item.quantity),
          unitPrice: number(item.unitPrice),
          discount: number(item.discount),
          total: number(item.total),
          unit: item.product?.unit ?? null
        })),
        corrections: sale.paymentCorrections.map((correction) => ({
          id: correction.id,
          oldPaymentMethod: correction.oldPaymentMethod,
          newPaymentMethod: correction.newPaymentMethod,
          reason: correction.reason,
          createdAt: correction.createdAt.toISOString(),
          correctedByName: correction.correctedBy?.name ?? null
        }))
      }))
    });
  } catch (error) {
    return errorResponse(error);
  }
}
