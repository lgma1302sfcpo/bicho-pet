import { describe, expect, it } from "vitest";

import { calculateCashDifference, calculateExpectedCash } from "@/lib/cash-register";
import { cancelSaleSchema, cashMovementSchema, closeCashRegisterSchema, correctSalePaymentSchema, openCashRegisterSchema, reopenCashRegisterSchema } from "@/schemas/cash-register.schemas";

describe("caixa", () => {
  it("calcula fundo, vendas, suprimentos e sangrias", () => {
    expect(calculateExpectedCash(200, { cashSales: 350.5, supplies: 50, withdrawals: 100 })).toBe(500.5);
  });

  it("calcula falta e sobra no fechamento", () => {
    expect(calculateCashDifference(495, 500.5)).toBe(-5.5);
    expect(calculateCashDifference(502, 500.5)).toBe(1.5);
  });

  it("valida os valores e exige motivo nas movimentações manuais", () => {
    expect(openCashRegisterSchema.parse({ openingAmount: 200 }).openingAmount).toBe(200);
    expect(closeCashRegisterSchema.parse({ actualAmount: 500.5 }).actualAmount).toBe(500.5);
    expect(() => cashMovementSchema.parse({ type: "WITHDRAWAL", amount: 20, description: "" })).toThrow();
    expect(() => cashMovementSchema.parse({ type: "SUPPLY", amount: 0, description: "Troco" })).toThrow();
  });

  it("valida a identificação de um caixa anterior para reabertura", () => {
    expect(reopenCashRegisterSchema.parse({ cashRegisterId: "cm12345678901234567890123" }).cashRegisterId).toBe("cm12345678901234567890123");
    expect(() => reopenCashRegisterSchema.parse({ cashRegisterId: "invalido" })).toThrow();
  });

  it("exige nova forma de pagamento e motivo para a correção", () => {
    expect(correctSalePaymentSchema.parse({ paymentMethod: "DEBIT_CARD", reason: "Lançado como Pix por engano" }).paymentMethod).toBe("DEBIT_CARD");
    expect(() => correctSalePaymentSchema.parse({ paymentMethod: "DEBIT_CARD", reason: "" })).toThrow();
    expect(() => correctSalePaymentSchema.parse({ paymentMethod: "BOLETO", reason: "Forma errada" })).toThrow();
  });

  it("exige um motivo para cancelar a venda", () => {
    expect(cancelSaleSchema.parse({ reason: "Venda lançada com itens errados" }).reason).toBe("Venda lançada com itens errados");
    expect(() => cancelSaleSchema.parse({ reason: "" })).toThrow();
  });
});
