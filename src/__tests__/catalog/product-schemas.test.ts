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

  it("exige somente os dados fiscais essenciais ao aprovar uma mercadoria", () => {
    const result = createProductSchema.safeParse({
      name: "Produto fiscal",
      category: "Racao",
      salePrice: 50,
      fiscalItemType: "GOOD",
      fiscalApproved: true
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(["ncm", "defaultCfop"]));
      expect(fields).not.toContain("originCode");
      expect(fields).not.toContain("icmsCode");
      expect(fields).not.toContain("pisCode");
      expect(fields).not.toContain("cofinsCode");
      expect(fields).not.toContain("cest");
      expect(fields).not.toContain("ibsCbsCode");
    }
  });
  it('aceita preco diferenciado para a loja selecionada', () => {
    const parsed = createProductSchema.parse({
      name: 'Magnus',
      category: 'Racao',
      salePrice: 11,
      useBranchPrice: true,
      branchSalePrice: '10,00'
    });

    expect(parsed.salePrice).toBe(11);
    expect(parsed.branchSalePrice).toBe(10);
    expect(parsed.useBranchPrice).toBe(true);
  });

  it('exige o valor quando o preco diferenciado esta ativo', () => {
    const result = createProductSchema.safeParse({
      name: 'Magnus',
      category: 'Racao',
      salePrice: 11,
      useBranchPrice: true
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.branchSalePrice).toBeDefined();
  });
});
