import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_READ);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const month = monthSchema.parse(request.nextUrl.searchParams.get("month"));
    const start = new Date(`${month}-01T00:00:00-03:00`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const [appointments, blocks] = await Promise.all([
      prisma.groomingAppointment.findMany({ where: { tenantId: session.user.currentTenantId, branchId, startAt: { gte: start, lt: end } }, select: { id: true, startAt: true, endAt: true, status: true } }),
      prisma.groomingScheduleBlock.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, startAt: { lt: end }, endAt: { gt: start } },
        include: { professional: { select: { name: true } } }
      })
    ]);
    return ok({ month, appointments: appointments.map((item) => ({ ...item, startAt: item.startAt.toISOString(), endAt: item.endAt.toISOString() })), blocks: blocks.map((item) => ({ id: item.id, professionalId: item.professionalId, professionalName: item.professional?.name ?? null, startAt: item.startAt.toISOString(), endAt: item.endAt.toISOString(), reason: item.reason })) });
  } catch (error) { return errorResponse(error); }
}
