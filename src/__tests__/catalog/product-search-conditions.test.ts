import { describe, expect, it } from "vitest";

import { buildProductSearchConditions } from "@/repositories/catalog/prisma-product.repository";

describe("condições da busca de produtos", () => {
  it("pesquisa cada palavra separadamente para tolerar espaços e outros textos entre elas", () => {
    const conditions = buildProductSearchConditions("  origens   cães adultos  ");

    expect(conditions).toHaveLength(3);
    expect(conditions[0].OR?.[0]).toEqual({ name: { contains: "origens", mode: "insensitive" } });
    expect(conditions[1].OR?.[0]).toEqual({ name: { contains: "cães", mode: "insensitive" } });
    expect(conditions[2].OR?.[0]).toEqual({ name: { contains: "adultos", mode: "insensitive" } });
  });
});
