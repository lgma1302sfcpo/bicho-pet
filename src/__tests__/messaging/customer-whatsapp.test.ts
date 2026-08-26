import { describe, expect, it } from "vitest";

import type { CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import {
  buildCustomerWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber
} from "@/lib/customer-whatsapp";

function customer(overrides: Partial<CustomerListItemDTO> = {}): CustomerListItemDTO {
  return {
    id: "customer-1",
    name: "Maria Silva",
    whatsapp: "13999990000",
    tags: [],
    status: "ACTIVE",
    lastPurchaseAt: null,
    daysSinceLastPurchase: null,
    purchaseCount: 0,
    totalSpent: 0,
    creditLimit: 0,
    reactivationLabel: "Primeira compra",
    ...overrides
  };
}

describe("mensagens de WhatsApp para clientes", () => {
  it("inclui o codigo do Brasil quando o telefone possui apenas DDD e numero", () => {
    expect(normalizeWhatsAppNumber("(13) 99999-0000")).toBe("5513999990000");
    expect(normalizeWhatsAppNumber("55 13 99999-0000")).toBe("5513999990000");
  });

  it("cria mensagem de primeira compra para cliente sem historico", () => {
    const message = buildCustomerWhatsAppMessage(customer());

    expect(message).toContain("Olá, Maria!");
    expect(message).toContain("primeira compra");
  });

  it("usa os dias de inatividade na mensagem de reativacao", () => {
    const message = buildCustomerWhatsAppMessage(customer({
      purchaseCount: 5,
      totalSpent: 850,
      daysSinceLastPurchase: 95,
      lastPurchaseAt: "2026-05-23T12:00:00.000Z"
    }));

    expect(message).toContain("95 dias desde sua última compra");
    expect(message).not.toContain("850");
  });

  it("usa a quantidade de compras na mensagem de fidelizacao", () => {
    const message = buildCustomerWhatsAppMessage(customer({ purchaseCount: 3 }), "LOYALTY");

    expect(message).toContain("3 compras");
  });

  it("monta link seguro com telefone normalizado e mensagem codificada", () => {
    const url = new URL(buildWhatsAppUrl("(13) 99999-0000", "Olá, Maria! Tudo bem?"));

    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/5513999990000");
    expect(url.searchParams.get("text")).toBe("Olá, Maria! Tudo bem?");
  });
});
