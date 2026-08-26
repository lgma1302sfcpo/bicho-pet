import { z } from "zod";

import { onlyDigits, parseBrazilianNumber } from "@/lib/utils";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalDigits = z
  .string()
  .optional()
  .transform((value) => (value ? onlyDigits(value) : undefined));

const optionalDate = z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional());

const queryBoolean = z.preprocess((value) => {
  if (value === "false" || value === false) {
    return false;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
}, z.boolean());

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente."),
  document: optionalDigits,
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  phone: optionalDigits,
  whatsapp: optionalDigits,
  birthDate: optionalDate,
  address: optionalText,
  street: optionalText,
  addressNumber: optionalText,
  complement: optionalText,
  district: optionalText,
  city: optionalText,
  cityCode: optionalDigits.refine((value) => !value || value.length === 7, "O código do município deve possuir sete números."),
  state: optionalText.refine((value) => !value || value.length === 2, "Selecione um estado."),
  zipCode: optionalDigits.refine((value) => !value || value.length === 8, "O Código de Endereçamento Postal deve possuir oito números."),
  stateRegistration: optionalDigits,
  creditLimit: z.preprocess(parseBrazilianNumber, z.number().min(0)).default(0),
  notes: optionalText,
  tags: z.array(z.string().trim().min(1)).default([])
});

export const updateCustomerSchema = createCustomerSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"])
});

export const customerFiltersSchema = z.object({
  search: z.string().trim().optional(),
  inactiveDays: z.coerce.number().int().min(1).max(3650).optional(),
  includeNeverPurchased: queryBoolean.default(true),
  contactableOnly: queryBoolean.default(false),
  minTotalSpent: z.coerce.number().min(0).optional(),
  maxTotalSpent: z.coerce.number().min(0).optional(),
  minPurchaseCount: z.coerce.number().int().min(0).optional(),
  maxPurchaseCount: z.coerce.number().int().min(0).optional(),
  birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
  tag: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional()
});
