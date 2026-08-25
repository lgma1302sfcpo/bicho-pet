import { describe, expect, it } from "vitest";

import { createProductSchema, productFiltersSchema } from "@/schemas/catalog/product.schemas";

describe("product schemas", () => {
  it("valida cadastro basico de produto de petshop", () => {
    const parsed = createProductSchema.parse({
      name: "Racao Premium 10kg",
      code: "RAC-10",
      category: "Racao",
      species: "DOG",
      salePrice: "149.90",
      costPrice: "100",
      stockQuantity: "8",
      minStock: "3"
    });

    expect(parsed.salePrice).toBe(149.9);
    expect(parsed.species).toBe("DOG");
  });

  it("converte filtro de baixo estoque", () => {
    const parsed = productFiltersSchema.parse({
      lowStockOnly: "true"
    });

    expect(parsed.lowStockOnly).toBe(true);
  });
});
