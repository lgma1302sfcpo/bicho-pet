import { NextRequest } from "next/server";
import { z } from "zod";

import { created, errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { groomingServiceSchema } from "@/schemas/grooming.schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = groomingServiceSchema.parse(await request.json());
    const item = await prisma.groomingService.create({ data: { ...input, tenantId: session.user.currentTenantId, branchId } });
    return created({ ...item, defaultPrice: Number(item.defaultPrice) });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = groomingServiceSchema.extend({ id: z.string().min(1) }).parse(await request.json());
    const result = await prisma.groomingService.updateMany({ where: { id: input.id, tenantId: session.user.currentTenantId, branchId }, data: { name: input.name, durationMinutes: input.durationMinutes, defaultPrice: input.defaultPrice } });
    return ok({ updated: result.count > 0 });
  } catch (error) { return errorResponse(error); }
}
