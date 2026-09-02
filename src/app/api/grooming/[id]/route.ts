import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { updateGroomingAppointmentSchema } from "@/schemas/grooming.schemas";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const { id } = await context.params;
    const input = updateGroomingAppointmentSchema.parse(await request.json());
    const { reminderSent, ...changes } = input;
    const result = await prisma.groomingAppointment.updateMany({
      where: { id, tenantId: session.user.currentTenantId, branchId },
      data: { ...changes, ...(reminderSent === undefined ? {} : { reminderSentAt: reminderSent ? new Date() : null }) }
    });
    if (!result.count) throw new AppError("Agendamento não encontrado.", "GROOMING_APPOINTMENT_NOT_FOUND", 404);
    return ok({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
