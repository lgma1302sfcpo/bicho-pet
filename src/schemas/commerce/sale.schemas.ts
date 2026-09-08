import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";

const numeric = z.preprocess(parseBrazilianNumber, z.number());
const paymentMethod = z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER"]);

export const saleItemSchema = z.object({
  productId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(2, "Informe a descrição do item."),
  quantity: numeric.pipe(z.number().positive("A quantidade deve ser maior que zero.")),
  unitPrice: numeric.pipe(z.number().min(0, "O preço não pode ser negativo.")),
  discount: numeric.pipe(z.number().min(0, "O desconto não pode ser negativo.")).default(0)
});

export const createSaleSchema = z.object({
  customerId: z.string().trim().optional().or(z.literal("")),
  paymentMethod: z
    .string()
    .trim()
    .min(1, "Selecione a forma de pagamento.")
    .pipe(z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER", "MIXED"])),
  payments: z.array(z.object({
    method: paymentMethod,
    amount: numeric.pipe(z.number().positive("O valor do pagamento deve ser maior que zero."))
  })).optional(),
  discount: numeric.pipe(z.number().min(0)).default(0),
  surcharge: numeric.pipe(z.number().min(0)).default(0),
  soldAt: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
  notes: z.string().trim().optional(),
  items: z.array(saleItemSchema).min(1, "Informe pelo menos um item.")
}).superRefine((sale, context) => {
  if (sale.paymentMethod !== "MIXED") return;
  if (!sale.payments || sale.payments.length < 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["payments"], message: "Informe pelo menos duas formas de pagamento." });
  }
  const methods = sale.payments?.map((payment) => payment.method) ?? [];
  if (new Set(methods).size !== methods.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["payments"], message: "Não repita a mesma forma de pagamento." });
  }
});
