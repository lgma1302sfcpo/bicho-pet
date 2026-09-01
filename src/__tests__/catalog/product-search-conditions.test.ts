import { describe, expect, it } from "vitest";

import { normalizeProductSearchTerms } from "@/repositories/catalog/prisma-product.repository";

describe("condições da busca de produtos", () => {
  it("normaliza espaços, letras maiúsculas e acentos antes de pesquisar", () => {
    const accentedTerms = normalizeProductSearchTerms("  Origens   CÃES adultos  ");
    const plainTerms = normalizeProductSearchTerms("origens caes adultos");

    expect(accentedTerms).toEqual(["origens", "caes", "adultos"]);
    expect(plainTerms).toEqual(accentedTerms);
  });
});
