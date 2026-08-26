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
    const result = await prisma.financialEntry.updateMany({ where: { id, tenantId: session.user.currentTenantId, branchId }, data: { status: input.status, paidAt: input.status === "PAID" ? new Date() : null } });
    if (!result.count) throw new AppError("Lançamento financeiro não encontrado.", "FINANCIAL_ENTRY_NOT_FOUND", 404);
    return ok({ updated: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FINANCE_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { id } = await context.params;
    const result = await prisma.financialEntry.deleteMany({ where: { id, tenantId: session.user.currentTenantId, branchId, saleId: null } });
    if (!result.count) throw new AppError("Lançamento não encontrado ou gerado por uma venda.", "FINANCIAL_ENTRY_NOT_DELETABLE", 422);
    return ok({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
