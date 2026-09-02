import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { cashRegisterInclude, serializeCashRegister } from "@/lib/cash-register-server";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.CASH_READ);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const where = { tenantId: session.user.currentTenantId, branchId };
    const [current, history] = await Promise.all([
      prisma.cashRegisterSession.findFirst({ where: { ...where, status: "OPEN" }, include: cashRegisterInclude }),
      prisma.cashRegisterSession.findMany({ where: { ...where, status: "CLOSED" }, include: cashRegisterInclude, orderBy: { closedAt: "desc" }, take: 30 })
    ]);

    return ok({
      current: current ? serializeCashRegister(current) : null,
      history: history.map(serializeCashRegister)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

