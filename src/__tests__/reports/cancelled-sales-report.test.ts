import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

describe("faturamento de vendas", () => {
  it("filtra vendas concluídas da loja selecionada sem limitar o relatório", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { sale: { findMany } } as unknown as PrismaClient;
    const repository = new PrismaCommerceRepository(database);

    await repository.listSales("tenant-1", "branch-1", { limit: null, status: "COMPLETED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          branchId: "branch-1",
          status: "COMPLETED"
        })
      })
    );
    expect(findMany.mock.calls[0][0]).not.toHaveProperty("take");
  });

  it("soma todas as lojas sem incluir canceladas nem aplicar limite", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = { sale: { findMany } } as unknown as PrismaClient;
    const repository = new PrismaCommerceRepository(database);

    await repository.listSales("tenant-1", null, { limit: null, status: "COMPLETED" });

    const query = findMany.mock.calls[0][0];
    expect(query.where).toEqual({ tenantId: "tenant-1", status: "COMPLETED" });
    expect(query).not.toHaveProperty("take");
  });
});
