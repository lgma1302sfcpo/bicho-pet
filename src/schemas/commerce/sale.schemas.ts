import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";

const numeric = z.preprocess(parseBrazilianNumber, z.number());

export const saleItemSchema = z.object({
  productId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(2, "Informe a descrição do item."),
  quantity: numeric.pipe(z.number().positive("A quantidade deve ser maior que zero.")),
  unitPrice: numeric.pipe(z.number().min(0, "O preço não pode ser negativo."))
});

export const createSaleSchema = z.object({
  customerId: z.string().trim().optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER", "MIXED"]),
  discount: numeric.pipe(z.number().min(0)).default(0),
  surcharge: numeric.pipe(z.number().min(0)).default(0),
  soldAt: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
  notes: z.string().trim().optional(),
  items: z.array(saleItemSchema).min(1, "Informe pelo menos um item.")
});
