// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findBlock: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("@/lib/require-permission", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    groomingAppointment: { findFirst: mocks.findFirst, findMany: mocks.findMany, updateMany: mocks.updateMany },
    groomingScheduleBlock: { findFirst: mocks.findBlock }
  }
}));

import { PATCH } from "@/app/api/grooming/[id]/route";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";

const scope = { id: "appointment-1", tenantId: "tenant-1", branchId: "branch-1" };
const appointment = {
  ...scope,
  professionalId: "professional-1",
  startAt: new Date("2026-10-20T09:00:00-03:00"),
  endAt: new Date("2026-10-20T10:30:00-03:00"),
  status: "CONFIRMED",
  reminderSentAt: new Date("2026-10-19T10:00:00-03:00")
};

function update(payload: Record<string, unknown>) {
  return PATCH(new NextRequest("http://localhost/api/grooming/appointment-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }), { params: Promise.resolve({ id: scope.id }) });
}

describe("edição do horário de banho e tosa", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: "user-1", currentTenantId: scope.tenantId, currentBranchId: scope.branchId } });
    mocks.findFirst.mockResolvedValue(appointment);
    mocks.findMany.mockResolvedValue([]);
    mocks.findBlock.mockResolvedValue(null);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("move o mesmo registro para outro dia mantendo a duração e liberando um novo lembrete", async () => {
    const response = await update({ startAt: "2026-10-21T14:15:00-03:00" });

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith(AUTH_PERMISSIONS.GROOMING_WRITE);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: scope });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: scope,
      data: { startAt: new Date("2026-10-21T17:15:00Z"), endAt: new Date("2026-10-21T18:45:00Z"), reminderSentAt: null }
    });
  });

  it("permite usar a segunda vaga e exclui o próprio agendamento da contagem", async () => {
    mocks.findMany.mockResolvedValue([{ startAt: appointment.startAt, endAt: appointment.endAt }]);

    expect((await update({ startAt: "2026-10-20T09:30:00-03:00" })).status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: scope.tenantId, branchId: scope.branchId, id: { not: scope.id }, professionalId: appointment.professionalId,
        status: { not: "CANCELLED" }, startAt: { lt: new Date("2026-10-20T14:00:00Z") }, endAt: { gt: new Date("2026-10-20T12:30:00Z") }
      },
      select: { startAt: true, endAt: true }
    });
  });

  it("rejeita um terceiro pet durante qualquer parte do novo atendimento", async () => {
    mocks.findMany.mockResolvedValue([
      { startAt: "2026-10-20T10:00:00-03:00", endAt: "2026-10-20T11:00:00-03:00" },
      { startAt: "2026-10-20T10:15:00-03:00", endAt: "2026-10-20T10:45:00-03:00" }
    ]);

    const response = await update({ startAt: "2026-10-20T09:30:00-03:00" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "GROOMING_TIME_CAPACITY_FULL" } });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("verifica bloqueios gerais e do profissional no novo período", async () => {
    mocks.findBlock.mockResolvedValue({ reason: "Almoço", endAt: new Date("2026-10-20T13:00:00-03:00") });

    const response = await update({ startAt: "2026-10-20T12:00:00-03:00" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "GROOMING_TIME_BLOCKED", message: "Horário bloqueado: Almoço. Disponível após 13:00." } });
    expect(mocks.findBlock).toHaveBeenCalledWith({
      where: {
        tenantId: scope.tenantId, branchId: scope.branchId, OR: [{ professionalId: null }, { professionalId: appointment.professionalId }],
        startAt: { lt: new Date("2026-10-20T16:30:00Z") }, endAt: { gt: new Date("2026-10-20T15:00:00Z") }
      },
      select: { reason: true, endAt: true }
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("mantém o lembrete enviado quando o horário não mudou", async () => {
    expect((await update({ startAt: appointment.startAt.toISOString() })).status).toBe(200);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("continua permitindo atualizar o status sem editar o horário", async () => {
    expect((await update({ status: "COMPLETED", photoTaken: true })).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: scope, data: { status: "COMPLETED", photoTaken: true } });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("não edita um agendamento fora da empresa ou loja selecionada", async () => {
    mocks.findFirst.mockResolvedValue(null);

    expect((await update({ startAt: "2026-10-21T09:00:00-03:00" })).status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: scope });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("não altera o horário de um agendamento cancelado", async () => {
    mocks.findFirst.mockResolvedValue({ ...appointment, status: "CANCELLED" });

    expect((await update({ startAt: "2026-10-21T09:00:00-03:00" })).status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("exige permissão para gerenciar agendamentos", async () => {
    mocks.requirePermission.mockRejectedValue(new AppError("Sem permissão.", "FORBIDDEN", 403));

    expect((await update({ startAt: "2026-10-21T09:00:00-03:00" })).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it.each([null, "", "ontem", "2026-10-20T09:00:00", "2026-02-30T09:00:00-03:00"])("rejeita uma data inválida ou sem fuso: %s", async (startAt) => {
    expect((await update({ startAt })).status).toBe(422);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
