import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

describe("faturamento de vendas", () => {
  it("consulta somente vendas concluídas para relatórios e listagens", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { sale: { findMany } } as unknown as PrismaClient;
    const repository = new PrismaCommerceRepository(database);

    await repository.listSales("tenant-1", "branch-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          branchId: "branch-1",
          status: "COMPLETED"
        })
      })
    );
  });
});
