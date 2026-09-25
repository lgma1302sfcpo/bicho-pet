import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { created, errorResponse, ok } from "@/lib/api-response";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AppError } from "@/lib/errors";
import { calculateAppointmentEnd, GROOMING_SIMULTANEOUS_CAPACITY, hasScheduleCapacity } from "@/lib/grooming-schedule";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { createGroomingAppointmentSchema, groomingDateSchema } from "@/schemas/grooming.schemas";

const number = (value: unknown) => Number(value ?? 0);
const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
  pet: { select: { id: true, name: true, species: true, breed: true } },
  service: { select: { id: true, name: true, durationMinutes: true, defaultPrice: true } },
  professional: { select: { id: true, name: true, commissionPercent: true } }
} satisfies Prisma.GroomingAppointmentInclude;

type AppointmentWithDetails = Prisma.GroomingAppointmentGetPayload<{ include: typeof appointmentInclude }>;

function serializeAppointment(item: AppointmentWithDetails) {
  return {
    ...item,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt.toISOString(),
    reminderSentAt: item.reminderSentAt?.toISOString() ?? null,
    price: number(item.price),
    commissionAmount: number(item.commissionAmount),
    service: { ...item.service, defaultPrice: number(item.service.defaultPrice) },
    professional: { ...item.professional, commissionPercent: number(item.professional.commissionPercent) }
  };
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_READ);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const date = groomingDateSchema.parse(request.nextUrl.searchParams.get("date") ?? todayInSaoPaulo());
    const { start, end } = dayRange(date);

    const reminderStart = dayRange(todayInSaoPaulo()).start;
    const reminderEnd = new Date(reminderStart.getTime() + 2 * 86_400_000);
    const [professionals, services, customers, appointments, blocks, reminders] = await Promise.all([
      prisma.groomingProfessional.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, active: true },
        orderBy: { name: "asc" }
      }),
      prisma.groomingService.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, active: true },
        orderBy: { name: "asc" }
      }),
      prisma.customer.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, status: "ACTIVE", pets: { some: {} } },
        select: { id: true, name: true, phone: true, whatsapp: true, pets: { select: { id: true, name: true, species: true, breed: true }, orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
        take: 300
      }),
      prisma.groomingAppointment.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, startAt: { gte: start, lt: end } },
        include: appointmentInclude,
        orderBy: [{ startAt: "asc" }, { professional: { name: "asc" } }]
      }),
      prisma.groomingScheduleBlock.findMany({
        where: { tenantId: session.user.currentTenantId, branchId, startAt: { lt: end }, endAt: { gt: start } },
        include: { professional: { select: { name: true } } },
        orderBy: { startAt: "asc" }
      }),
      prisma.groomingAppointment.findMany({
        where: {
          tenantId: session.user.currentTenantId,
          branchId,
          startAt: { gte: reminderStart, lt: reminderEnd },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          reminderSentAt: null
        },
        include: appointmentInclude,
        orderBy: { startAt: "asc" }
      })
    ]);

    return ok({
      date,
      professionals: professionals.map((item) => ({ ...item, commissionPercent: number(item.commissionPercent) })),
      services: services.map((item) => ({ ...item, defaultPrice: number(item.defaultPrice) })),
      customers,
      appointments: appointments.map(serializeAppointment),
      blocks: blocks.map((item) => ({ id: item.id, professionalId: item.professionalId, professionalName: item.professional?.name ?? null, startAt: item.startAt.toISOString(), endAt: item.endAt.toISOString(), reason: item.reason })),
      reminders: reminders.map(serializeAppointment)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.GROOMING_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const input = createGroomingAppointmentSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;

    const [professional, service, pet] = await Promise.all([
      prisma.groomingProfessional.findFirst({ where: { id: input.professionalId, tenantId, branchId, active: true } }),
      prisma.groomingService.findFirst({ where: { id: input.serviceId, tenantId, branchId, active: true } }),
      prisma.pet.findFirst({ where: { id: input.petId, customerId: input.customerId, customer: { tenantId, branchId } } })
    ]);

    if (!professional) throw new AppError("Profissional inválido para esta loja.", "INVALID_GROOMING_PROFESSIONAL", 422);
    if (!service) throw new AppError("Serviço inválido para esta loja.", "INVALID_GROOMING_SERVICE", 422);
    if (!pet) throw new AppError("O pet não pertence ao tutor selecionado.", "INVALID_GROOMING_PET", 422);

    const endAt = calculateAppointmentEnd(input.startAt, service.durationMinutes);
    const [overlappingAppointments, blocked] = await Promise.all([
      prisma.groomingAppointment.findMany({
        where: { tenantId, branchId, professionalId: professional.id, status: { not: "CANCELLED" }, startAt: { lt: endAt }, endAt: { gt: input.startAt } },
        select: { startAt: true, endAt: true }
      }),
      prisma.groomingScheduleBlock.findFirst({
        where: { tenantId, branchId, OR: [{ professionalId: null }, { professionalId: professional.id }], startAt: { lt: endAt }, endAt: { gt: input.startAt } },
        select: { reason: true, endAt: true }
      })
    ]);

    if (blocked) {
      const endTime = blocked.endAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
      throw new AppError(`Horário bloqueado: ${blocked.reason}. Disponível após ${endTime}.`, "GROOMING_TIME_BLOCKED", 409);
    }
    if (!hasScheduleCapacity(input.startAt, endAt, overlappingAppointments, GROOMING_SIMULTANEOUS_CAPACITY)) {
      throw new AppError("Este profissional já possui dois pets nesse período. Escolha outro horário.", "GROOMING_TIME_CAPACITY_FULL", 409);
    }

    const commissionAmount = 0;
    const appointment = await prisma.groomingAppointment.create({
      data: {
        tenantId,
        branchId,
        customerId: input.customerId,
        petId: input.petId,
        serviceId: service.id,
        professionalId: professional.id,
        createdById: session.user.id,
        startAt: input.startAt,
        endAt,
        price: input.price,
        commissionAmount,
        isPackage: input.isPackage,
        notes: input.notes
      },
      select: { id: true, startAt: true, endAt: true }
    });

    return created({ ...appointment, startAt: appointment.startAt.toISOString(), endAt: appointment.endAt.toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
