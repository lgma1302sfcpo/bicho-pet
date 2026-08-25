import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const numeric = z.preprocess(parseBrazilianNumber, z.number());

export const inventoryMovementSchema = z.object({
  productId: z.string().min(1, "Selecione o produto."),
  type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
  quantity: numeric.pipe(z.number().min(0, "Informe uma quantidade valida.")),
  reason: z.string().trim().min(3, "Informe o motivo da movimentacao."),
  reference: optionalText
});

export const financialEntrySchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  description: z.string().trim().min(3, "Informe a descricao."),
  category: z.string().trim().min(2, "Selecione a categoria."),
  amount: numeric.pipe(z.number().positive("O valor deve ser maior que zero.")),
  dueDate: z.coerce.date(),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER", "MIXED"]).optional().or(z.literal("")),
  notes: optionalText
});

export const financialStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED"])
});
