import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { hasScheduleCapacity } from "@/lib/grooming-schedule";
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
    const { startAt, reminderSent, ...changes } = input;
    const where = { id, tenantId: session.user.currentTenantId, branchId };
    const data: Prisma.GroomingAppointmentUpdateManyMutationInput = {
      ...changes,
      ...(reminderSent === undefined ? {} : { reminderSentAt: reminderSent ? new Date() : null })
    };

    if (startAt) {
      const appointment = await prisma.groomingAppointment.findFirst({ where });
      if (!appointment) throw new AppError("Agendamento não encontrado.", "GROOMING_APPOINTMENT_NOT_FOUND", 404);
      if (appointment.status === "CANCELLED") {
        throw new AppError("Não é possível alterar o horário de um agendamento cancelado.", "GROOMING_APPOINTMENT_CANCELLED", 409);
      }

      if (startAt.getTime() !== appointment.startAt.getTime()) {
        const endAt = new Date(startAt.getTime() + appointment.endAt.getTime() - appointment.startAt.getTime());
        const [overlappingAppointments, blocked] = await Promise.all([
          prisma.groomingAppointment.findMany({
            where: { tenantId: where.tenantId, branchId, id: { not: id }, professionalId: appointment.professionalId, status: { not: "CANCELLED" }, startAt: { lt: endAt }, endAt: { gt: startAt } },
            select: { startAt: true, endAt: true }
          }),
          prisma.groomingScheduleBlock.findFirst({
            where: { tenantId: where.tenantId, branchId, OR: [{ professionalId: null }, { professionalId: appointment.professionalId }], startAt: { lt: endAt }, endAt: { gt: startAt } },
            select: { reason: true, endAt: true }
          })
        ]);

        if (blocked) {
          const endTime = blocked.endAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
          throw new AppError(`Horário bloqueado: ${blocked.reason}. Disponível após ${endTime}.`, "GROOMING_TIME_BLOCKED", 409);
        }
        if (!hasScheduleCapacity(startAt, endAt, overlappingAppointments)) {
          throw new AppError("Este profissional já possui dois pets nesse período. Escolha outro horário.", "GROOMING_TIME_CAPACITY_FULL", 409);
        }

        data.startAt = startAt;
        data.endAt = endAt;
        data.reminderSentAt = null;
      }
    }

    if (!Object.values(data).some((value) => value !== undefined)) return ok({ updated: true });

    const result = await prisma.groomingAppointment.updateMany({
      where,
      data
    });
    if (!result.count) throw new AppError("Agendamento não encontrado.", "GROOMING_APPOINTMENT_NOT_FOUND", 404);
    return ok({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
