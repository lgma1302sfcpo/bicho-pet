import { describe, expect, it } from "vitest";

import { createCustomerSchema, customerFiltersSchema } from "@/schemas/commerce/customer.schemas";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";

describe("commerce schemas", () => {
  it("normaliza documento e telefone do cliente", () => {
    const parsed = createCustomerSchema.parse({
      name: "Ana Cliente",
      document: "123.456.789-10",
      phone: "(13) 99999-0000",
      whatsapp: "(13) 98888-0000",
      creditLimit: "150.50",
      tags: ["vip"]
    });

    expect(parsed.document).toBe("12345678910");
    expect(parsed.phone).toBe("13999990000");
    expect(parsed.creditLimit).toBe(150.5);
  });

  it("converte booleano de query string corretamente", () => {
    const parsed = customerFiltersSchema.parse({
      inactiveDays: "60",
      includeNeverPurchased: "false"
    });

    expect(parsed.inactiveDays).toBe(60);
    expect(parsed.includeNeverPurchased).toBe(false);
  });

  it("converte true de query string corretamente", () => {
    const parsed = customerFiltersSchema.parse({
      includeNeverPurchased: "true",
      contactableOnly: "true"
    });

    expect(parsed.includeNeverPurchased).toBe(true);
    expect(parsed.contactableOnly).toBe(true);
  });

  it("rejeita venda sem itens", () => {
    const parsed = createSaleSchema.safeParse({
      paymentMethod: "PIX",
      discount: 0,
      surcharge: 0,
      items: []
    });

    expect(parsed.success).toBe(false);
  });

  it("exige que a forma de pagamento seja selecionada", () => {
    const parsed = createSaleSchema.safeParse({
      paymentMethod: "",
      discount: 0,
      surcharge: 0,
      items: [{ description: "Produto", quantity: 1, unitPrice: 10 }]
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe("Selecione a forma de pagamento.");
  });
});
