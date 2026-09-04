import { describe, expect, it } from "vitest";

import { buildProductBranchStockRows } from "@/lib/product-branches";

describe("catálogo compartilhado entre lojas", () => {
  it("cria o produto nas duas lojas e mantém o estoque inicial somente na loja selecionada", () => {
    const rows = buildProductBranchStockRows({
      tenantId: "tenant-1",
      productId: "product-1",
      selectedBranchId: "branch-1",
      branchIds: ["branch-1", "branch-2"],
      stockQuantity: 12,
      minStock: 2,
      maxStock: 30,
      location: "Prateleira A"
    });

    expect(rows).toEqual([
      expect.objectContaining({ branchId: "branch-1", stockQuantity: 12, location: "Prateleira A" }),
      expect.objectContaining({ branchId: "branch-2", stockQuantity: 0, location: null })
    ]);
    expect(rows.every((row) => row.minStock === 2 && row.maxStock === 30)).toBe(true);
  });

  it("não duplica a loja selecionada", () => {
    const rows = buildProductBranchStockRows({ tenantId: "tenant-1", productId: "product-1", selectedBranchId: "branch-1", branchIds: ["branch-1", "branch-1"], stockQuantity: 1, minStock: 0, maxStock: 0 });
    expect(rows).toHaveLength(1);
  });
});
