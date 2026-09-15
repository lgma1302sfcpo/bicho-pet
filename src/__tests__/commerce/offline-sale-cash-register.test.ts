import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

describe("venda offline e turno de caixa", () => {
  it.each([{ openCashId: null }, { openCashId: "next-shift" }])("mantém a venda pendente quando o caixa original não está aberto: $openCashId", async ({ openCashId }) => {
    const saleCreate = vi.fn();
    const tx = {
      cashRegisterSession: { findFirst: vi.fn().mockResolvedValue(openCashId ? { id: openCashId } : null) },
      sale: { create: saleCreate }
    };
    const db = { $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaClient;
    const repository = new PrismaCommerceRepository(db);

    await expect(repository.createSale({
      tenantId: "tenant", branchId: "branch", userId: "user", code: "VD-1", subtotal: 10, total: 10,
      sale: {
        offlineCashRegisterSessionId: "original-shift", paymentMethod: "CASH", discount: 0, surcharge: 0,
        items: [{ description: "Item avulso", quantity: 1, unitPrice: 10, discount: 0 }]
      }
    })).rejects.toMatchObject({ code: "OFFLINE_CASH_REGISTER_MISMATCH", status: 409 });
    expect(saleCreate).not.toHaveBeenCalled();
  });
});
