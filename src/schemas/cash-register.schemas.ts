import { z } from "zod";

const money = z.coerce.number().finite().min(0, "Informe um valor válido.").max(999999999.99);

export const openCashRegisterSchema = z.object({
  openingAmount: money,
  notes: z.string().trim().max(500).optional().default("")
});

export const cashMovementSchema = z.object({
  type: z.enum(["SUPPLY", "WITHDRAWAL"]),
  amount: money.refine((value) => value > 0, "O valor deve ser maior que zero."),
  description: z.string().trim().min(2, "Informe o motivo.").max(200)
});

export const closeCashRegisterSchema = z.object({
  actualAmount: money,
  notes: z.string().trim().max(500).optional().default("")
});

export const reopenCashRegisterSchema = z.object({
  cashRegisterId: z.string().cuid("Caixa inválido.")
});

export const correctSalePaymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "STORE_CREDIT", "VOUCHER", "MIXED"]),
  reason: z.string().trim().min(3, "Informe o motivo da correção.").max(300)
});

export const cancelSaleSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(300)
});
