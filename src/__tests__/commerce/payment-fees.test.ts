import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { calculatePaymentFee, paymentRate, stoneRates } from "@/lib/payment-fees";
import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";

const items = [{ description: "Produto", quantity: 1, unitPrice: 100 }];

describe("taxas de pagamento", () => {
  it("aplica todas as taxas informadas da Stone", () => {
    for (const brand of ["MASTERCARD", "VISA", "ELO", "AMEX"] as const) {
      const rates = stoneRates[brand];
      expect(paymentRate("DEBIT_CARD", { machine: "STONE", brand })).toBe(rates.debit ?? undefined);
      rates.credit.forEach((rate, index) => {
        expect(calculatePaymentFee("CREDIT_CARD", 100, { machine: "STONE", brand, installments: index + 1 }))
          .toEqual({ rate, feeAmount: rate, netAmount: Math.round((100 - rate) * 100) / 100 });
      });
    }
  });

  it("arredonda em centavos sobre o valor pago", () => {
    expect(calculatePaymentFee("DEBIT_CARD", 13.5, { machine: "STONE", brand: "VISA" }))
      .toEqual({ rate: 2.09, feeAmount: 0.28, netAmount: 13.22 });
    expect(calculatePaymentFee("CREDIT_CARD", 100, { machine: "OTHER", manualRate: 3.5 }))
      .toEqual({ rate: 3.5, feeAmount: 3.5, netAmount: 96.5 });
  });

  it.each([
    { machine: "STONE", brand: "AMEX", installments: 1, method: "DEBIT_CARD" },
    { machine: "STONE", brand: "VISA", installments: 5, method: "CREDIT_CARD" },
    { machine: "OTHER", installments: 1, method: "CREDIT_CARD" }
  ])("rejeita modalidade sem taxa: $method $brand", ({ method, ...paymentDetails }) => {
    expect(createSaleSchema.safeParse({ paymentMethod: method, paymentDetails, items }).success).toBe(false);
  });

  it("separa Pix chave de Pix máquina em pagamentos divididos", () => {
    expect(createSaleSchema.safeParse({ paymentMethod: "MIXED", items, payments: [
      { method: "PIX", amount: 40, details: { pixType: "KEY" } },
      { method: "PIX", amount: 60, details: { pixType: "MACHINE" } }
    ] }).success).toBe(true);
    expect(calculatePaymentFee("PIX", 100, { pixType: "MACHINE" }).feeAmount).toBe(0);
  });

  it("salva o cálculo no pagamento e a despesa apenas sobre a parte no cartão", async () => {
    const saleCreate = vi.fn().mockResolvedValue({ id: "sale", code: "VD-1", total: 100 });
    const financialCreate = vi.fn();
    const tx = {
      cashRegisterSession: { findFirst: vi.fn().mockResolvedValue({ id: "cash" }) },
      sale: { create: saleCreate },
      financialEntry: { createMany: financialCreate }
    };
    const db = { $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaClient;
    await new PrismaCommerceRepository(db).createSale({
      tenantId: "tenant", branchId: "branch", userId: "user", code: "VD-1", subtotal: 100, total: 100,
      sale: createSaleSchema.parse({ paymentMethod: "MIXED", items, payments: [
        { method: "PIX", amount: 40, details: { pixType: "KEY" } },
        { method: "DEBIT_CARD", amount: 60, details: { machine: "STONE", brand: "VISA", feeAmount: 0 } }
      ] })
    });
    expect(saleCreate.mock.calls[0][0].data.payments.create[1]).toMatchObject({
      amount: 60, details: { rate: 2.09, feeAmount: 1.25, netAmount: 58.75, machine: "STONE", brand: "VISA" }
    });
    expect(financialCreate.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ type: "REVENUE", amount: 40 }), expect.objectContaining({ type: "REVENUE", amount: 60 })
    ]);
    expect(financialCreate.mock.calls[1][0].data).toEqual([
      expect.objectContaining({ type: "EXPENSE", amount: 1.25, status: "PAID", saleId: "sale" })
    ]);
  });
});
