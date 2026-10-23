import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";
import { isCardPayment, paymentRate } from "@/lib/payment-fees";

const numeric = z.preprocess(parseBrazilianNumber, z.number());
const paymentMethod = z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER"]);

export const paymentDetailsSchema = z.object({
  machine: z.enum(["STONE", "OTHER"]).optional(),
  brand: z.enum(["MASTERCARD", "VISA", "ELO", "AMEX"]).optional(),
  installments: z.coerce.number().int().min(1).max(12).optional(),
  manualRate: z.preprocess((value) => value === "" ? undefined : parseBrazilianNumber(value), z.number().min(0).max(100).optional()),
  pixType: z.enum(["KEY", "MACHINE"]).optional()
});

export function validatePaymentDetails(method: string, details: z.infer<typeof paymentDetailsSchema> | undefined, context: z.RefinementCtx, path: (string | number)[]) {
  // Older clients and offline sales can still submit their original payment format.
  if (!details) return;
  if (isCardPayment(method)) {
    let message: string | undefined;
    if (!details.machine) message = "Selecione a maquininha.";
    else if (details.machine === "STONE" && !details.brand) message = "Selecione a bandeira.";
    else if (method === "CREDIT_CARD" && !details.installments) message = "Selecione as parcelas.";
    else if (paymentRate(method, details) === undefined) message = "Taxa não informada para esta modalidade. Confira a bandeira e as parcelas.";
    if (message) context.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
  if (method === "PIX" && !details.pixType) context.addIssue({ code: z.ZodIssueCode.custom, path, message: "Selecione Pix chave ou Pix máquina." });
}

export const saleItemSchema = z.object({
  productId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(2, "Informe a descrição do item."),
  quantity: numeric.pipe(z.number().positive("A quantidade deve ser maior que zero.")),
  unitPrice: numeric.pipe(z.number().min(0, "O preço não pode ser negativo.")),
  discount: numeric.pipe(z.number().min(0, "O desconto não pode ser negativo.")).default(0)
});

export const createSaleSchema = z.object({
  offlineId: z.string().uuid().optional(),
  offlineCashRegisterSessionId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().optional().or(z.literal("")),
  paymentDetails: paymentDetailsSchema.optional(),
  paymentMethod: z
    .string()
    .trim()
    .min(1, "Selecione a forma de pagamento.")
    .pipe(z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER", "MIXED"])),
  payments: z.array(z.object({
    method: paymentMethod,
    details: paymentDetailsSchema.optional(),
    amount: numeric.pipe(z.number().positive("O valor do pagamento deve ser maior que zero."))
  })).optional(),
  discount: numeric.pipe(z.number().min(0)).default(0),
  surcharge: numeric.pipe(z.number().min(0)).default(0),
  soldAt: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
  notes: z.string().trim().optional(),
  items: z.array(saleItemSchema).min(1, "Informe pelo menos um item.")
}).superRefine((sale, context) => {
  if (sale.paymentMethod === "MIXED") {
    sale.payments?.forEach((payment, index) => validatePaymentDetails(payment.method, payment.details, context, ["payments", index, "details"]));
  } else validatePaymentDetails(sale.paymentMethod, sale.paymentDetails, context, ["paymentDetails"]);
  if (sale.offlineId && !sale.offlineCashRegisterSessionId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["offlineCashRegisterSessionId"], message: "Informe o caixa original da venda offline." });
  }
  if (sale.paymentMethod === "STORE_CREDIT" && !sale.customerId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerId"], message: "Selecione o cliente para registrar uma venda fiada." });
  }
  if (sale.paymentMethod !== "MIXED") return;
  if (!sale.payments || sale.payments.length < 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["payments"], message: "Informe pelo menos duas formas de pagamento." });
  }
  const methods = sale.payments?.map((payment) => payment.method === "PIX" ? `${payment.method}:${payment.details?.pixType ?? "KEY"}` : payment.method) ?? [];
  if (new Set(methods).size !== methods.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["payments"], message: "Não repita a mesma forma de pagamento." });
  }
});
