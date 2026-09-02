import { NextRequest } from "next/server";
import { z } from "zod";

import { created, errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { groomingProfessionalSchema } from "@/schemas/grooming.schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = groomingProfessionalSchema.parse(await request.json());
    const item = await prisma.groomingProfessional.create({ data: { ...input, tenantId: session.user.currentTenantId, branchId } });
    return created({ ...item, commissionPercent: Number(item.commissionPercent) });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = groomingProfessionalSchema.extend({ id: z.string().min(1) }).parse(await request.json());
    const result = await prisma.groomingProfessional.updateMany({ where: { id: input.id, tenantId: session.user.currentTenantId, branchId }, data: { name: input.name, commissionPercent: input.commissionPercent } });
    return ok({ updated: result.count > 0 });
  } catch (error) { return errorResponse(error); }
}
