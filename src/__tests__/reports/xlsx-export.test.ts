// @vitest-environment node

import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildXlsx } from "@/lib/xlsx-export";

describe("exportacao XLSX", () => {
  it("gera um arquivo Office Open XML com varias planilhas e texto escapado", () => {
    const bytes = buildXlsx([
      { name: "Vendas", rows: [{ Codigo: "VENDA-1", Cliente: "Maria & Joao", Total: 49.9 }] },
      { name: "Pagamentos", rows: [{ Forma: "Pix", Receita: 49.9 }] }
    ]);
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toContain("[Content_Types].xml");
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml");
    expect(strFromU8(files["xl/workbook.xml"])).toContain('sheet name="Pagamentos"');
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("Maria &amp; Joao");
  });
});
