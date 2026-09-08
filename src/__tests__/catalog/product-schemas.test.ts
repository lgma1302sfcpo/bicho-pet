import { describe, expect, it } from "vitest";

import { createProductSchema, productFiltersSchema, updateProductSchema } from "@/schemas/catalog/product.schemas";

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

  it("aceita alíquota com vírgula e campo vazio", () => {
    const baseProduct = {
      name: "Banho para cachorro",
      category: "Servico",
      species: "DOG" as const,
      salePrice: "80,00",
      fiscalItemType: "SERVICE" as const
    };

    expect(createProductSchema.parse({ ...baseProduct, issRate: "5,00" }).issRate).toBe(5);
    expect(createProductSchema.parse({ ...baseProduct, issRate: "" }).issRate).toBeUndefined();
    expect(createProductSchema.parse({ ...baseProduct, issRate: null }).issRate).toBeUndefined();
  });

  it("explica quando a alíquota é inválida", () => {
    const result = createProductSchema.safeParse({
      name: "Banho para cachorro",
      category: "Servico",
      salePrice: 80,
      issRate: "150,00"
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.issRate?.[0]).toContain("100%");
  });

  it("aceita campos opcionais nulos ao editar um produto", () => {
    const parsed = updateProductSchema.parse({
      name: "Produto existente",
      category: "Racao",
      salePrice: 50,
      status: "ACTIVE",
      code: null,
      sku: null,
      barcode: null,
      subcategory: null,
      brand: null,
      ncm: null,
      cest: null,
      defaultCfop: null,
      icmsCode: null,
      pisCode: null,
      cofinsCode: null,
      ibsCbsCode: null,
      taxClassificationCode: null,
      serviceCode: null
    });

    expect(parsed.sku).toBeUndefined();
    expect(parsed.ncm).toBeUndefined();
    expect(parsed.serviceCode).toBeUndefined();
  });
});
