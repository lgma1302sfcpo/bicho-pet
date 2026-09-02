import { NextRequest } from "next/server";

import { created, errorResponse } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { groomingScheduleBlockSchema } from "@/schemas/grooming.schemas";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const tenantId = session.user.currentTenantId;
    const input = groomingScheduleBlockSchema.parse(await request.json());

    if (input.professionalId) {
      const professional = await prisma.groomingProfessional.findFirst({ where: { id: input.professionalId, tenantId, branchId, active: true } });
      if (!professional) throw new AppError("Profissional inválido para esta loja.", "INVALID_GROOMING_PROFESSIONAL", 422);
    }

    const conflict = await prisma.groomingAppointment.findFirst({
      where: {
        tenantId,
        branchId,
        status: { not: "CANCELLED" },
        ...(input.professionalId ? { professionalId: input.professionalId } : {}),
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt }
      },
      select: { startAt: true, pet: { select: { name: true } } }
    });
    if (conflict) throw new AppError(`Já existe atendimento de ${conflict.pet.name} nesse período. Cancele ou remaneje antes de bloquear.`, "GROOMING_BLOCK_CONFLICT", 409);

    const block = await prisma.groomingScheduleBlock.create({ data: { ...input, tenantId, branchId } });
    return created({ ...block, startAt: block.startAt.toISOString(), endAt: block.endAt.toISOString() });
  } catch (error) { return errorResponse(error); }
}
