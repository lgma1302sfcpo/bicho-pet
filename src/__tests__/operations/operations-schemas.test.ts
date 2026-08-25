import { describe, expect, it } from "vitest";

import { applyInputMask, parseBrazilianNumber } from "@/lib/utils";
import { financialEntrySchema, inventoryMovementSchema } from "@/schemas/operations.schemas";

describe("mascaras e operacoes", () => {
  it("formata documentos, telefones, moeda e campos alfabeticos", () => {
    expect(applyInputMask("12345678901", "document")).toBe("123.456.789-01");
    expect(applyInputMask("13999990000", "phone")).toBe("(13) 99999-0000");
    expect(applyInputMask("123456", "currency")).toContain("1.234,56");
    expect(applyInputMask("Maria 123", "letters")).toBe("Maria ");
    expect(parseBrazilianNumber("R$ 1.234,56")).toBe(1234.56);
  });

  it("aceita quantidade brasileira em movimentacao de estoque", () => {
    const parsed = inventoryMovementSchema.parse({ productId: "produto-1", type: "ENTRY", quantity: "2,500", reason: "Compra de fornecedor" });
    expect(parsed.quantity).toBe(2.5);
  });

  it("aceita valor monetario formatado no financeiro", () => {
    const parsed = financialEntrySchema.parse({ type: "EXPENSE", status: "PENDING", description: "Compra de racoes", category: "Fornecedores", amount: "R$ 1.234,56", dueDate: "2026-08-24", paymentMethod: "PIX" });
    expect(parsed.amount).toBe(1234.56);
  });
});
