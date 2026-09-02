import { describe, expect, it } from "vitest";

import { calculateAppointmentEnd, nextAvailableStart, periodsOverlap } from "@/lib/grooming-schedule";
import { buildGroomingWhatsAppReminder } from "@/lib/grooming-reminder";
import { createGroomingAppointmentSchema, groomingProfessionalSchema, groomingScheduleBlockSchema, groomingServiceSchema } from "@/schemas/grooming.schemas";

describe("agenda de banho e tosa", () => {
  it("calcula 10h30 para um serviço de 1h30 iniciado às 09h", () => {
    const start = new Date("2026-09-01T09:00:00-03:00");
    expect(calculateAppointmentEnd(start, 90).toISOString()).toBe("2026-09-01T13:30:00.000Z");
  });

  it("sugere o primeiro horário livre respeitando os atendimentos existentes", () => {
    const result = nextAvailableStart(new Date("2026-09-01T09:00:00-03:00"), 60, [
      { startAt: "2026-09-01T09:00:00-03:00", endAt: "2026-09-01T10:30:00-03:00" },
      { startAt: "2026-09-01T11:30:00-03:00", endAt: "2026-09-01T12:30:00-03:00" }
    ]);
    expect(result.toISOString()).toBe("2026-09-01T13:30:00.000Z");
  });

  it("permite iniciar exatamente quando o atendimento anterior termina", () => {
    const firstStart = new Date("2026-09-01T09:00:00-03:00");
    const firstEnd = new Date("2026-09-01T10:30:00-03:00");
    const secondStart = new Date("2026-09-01T10:30:00-03:00");
    const secondEnd = new Date("2026-09-01T11:30:00-03:00");
    expect(periodsOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(false);
  });

  it("valida serviço, profissional e agendamento", () => {
    expect(groomingServiceSchema.parse({ name: "Banho e tosa completa", durationMinutes: 90, defaultPrice: "R$ 110,00" }).defaultPrice).toBe(110);
    expect(groomingProfessionalSchema.parse({ name: "Stefanne", commissionPercent: "35" }).commissionPercent).toBe(35);
    expect(createGroomingAppointmentSchema.parse({ customerId: "c1", petId: "p1", serviceId: "s1", professionalId: "g1", startAt: "2026-09-01T09:00:00-03:00", price: "85", isPackage: false }).startAt).toBeInstanceOf(Date);
  });

  it("valida bloqueios e impede horário final anterior ao inicial", () => {
    expect(groomingScheduleBlockSchema.parse({ startAt: "2026-09-01T12:00:00-03:00", endAt: "2026-09-01T13:00:00-03:00", reason: "Almoço" }).reason).toBe("Almoço");
    expect(() => groomingScheduleBlockSchema.parse({ startAt: "2026-09-01T13:00:00-03:00", endAt: "2026-09-01T12:00:00-03:00", reason: "Almoço" })).toThrow();
  });

  it("monta o lembrete manual do WhatsApp com os dados do atendimento", () => {
    const link = buildGroomingWhatsAppReminder({ customerName: "Carla", petName: "Mel", serviceName: "Banho", professionalName: "Stefanne", startAt: "2026-09-02T09:00:00-03:00", phone: "(11) 99999-3797" });
    expect(link).toContain("https://wa.me/5511999993797");
    expect(decodeURIComponent(link ?? "")).toContain("Mel: Banho, dia 02/09/2026 às 09:00");
  });
});
