import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";

const numeric = z.preprocess(parseBrazilianNumber, z.number());
const optionalText = z.string().trim().max(500).optional().transform((value) => value || undefined);

export const groomingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const groomingProfessionalSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do profissional.").max(100),
  commissionPercent: numeric.pipe(z.number().min(0).max(100)).default(0)
});

export const groomingServiceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(120),
  durationMinutes: numeric.pipe(z.number().int().min(5, "A duração mínima é de 5 minutos.").max(720)),
  defaultPrice: numeric.pipe(z.number().min(0)).default(0)
});

export const createGroomingAppointmentSchema = z.object({
  customerId: z.string().min(1, "Selecione o tutor."),
  petId: z.string().min(1, "Selecione o pet."),
  serviceId: z.string().min(1, "Selecione o serviço."),
  professionalId: z.string().min(1, "Selecione o profissional."),
  startAt: z.coerce.date(),
  price: numeric.pipe(z.number().min(0, "O valor não pode ser negativo.")),
  isPackage: z.boolean().default(false),
  notes: optionalText
});

export const updateGroomingAppointmentSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  purchasedProducts: z.boolean().optional(),
  photoTaken: z.boolean().optional(),
  reminderSent: z.boolean().optional(),
  notes: optionalText
}).refine((value) => Object.values(value).some((item) => item !== undefined), "Informe uma alteração.");

export const groomingScheduleBlockSchema = z.object({
  professionalId: z.string().optional().transform((value) => value || undefined),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  reason: z.string().trim().min(2, "Informe o motivo do bloqueio.").max(160)
}).refine((value) => value.endAt > value.startAt, { path: ["endAt"], message: "O horário final deve ser posterior ao inicial." });
