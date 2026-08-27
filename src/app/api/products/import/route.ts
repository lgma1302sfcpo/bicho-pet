import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { created, errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/schemas/catalog/product.schemas";

const text = (value: unknown) => value === undefined || value === null ? "" : String(value).trim();
const number = (value: unknown) => typeof value === "number" ? value : Number(text(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Selecione um arquivo Excel.");
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (!rows.length) throw new Error("A planilha não possui produtos.");
    const keys = Object.keys(rows[0]);
    const find = (row: Record<string, unknown>, ...names: string[]) => {
      const key = keys.find((candidate) => names.includes(normalized(candidate)));
      return key ? row[key] : undefined;
    };
    const seen = new Set<string>();
    const data = rows.map((row, index) => {
      const code = text(find(row, "codigo", "código")) || undefined;
      const sku = text(find(row, "codigo ref.", "codigo ref", "sku")) || undefined;
      const barcode = text(find(row, "ean / gtin", "ean", "gtin", "codigo extra")) || undefined;
      for (const [label, value] of [["código", code], ["SKU", sku], ["código de barras", barcode]] as const) {
        if (value && seen.has(`${label}:${value}`)) throw new Error(`Linha ${index + 2}: ${label} repetido (${value}).`);
        if (value) seen.add(`${label}:${value}`);
      }
      return createProductSchema.parse({
        name: text(find(row, "nome", "produto")),
        code, sku, barcode,
        category: text(find(row, "categoria")) || "Sem categoria",
        subcategory: text(find(row, "sub categoria", "subcategoria")) || undefined,
        brand: text(find(row, "marca")) || undefined,
        supplier: text(find(row, "fornecedor principal", "fornecedor")) || undefined,
        unit: text(find(row, "unidade")) || "UN",
        costPrice: number(find(row, "preco de custo", "custo")),
        salePrice: number(find(row, "preco", "preço", "preco de venda", "preço de venda")),
        stockQuantity: Math.max(0, number(find(row, "estoque atual", "estoque"))),
        minStock: Math.max(0, number(find(row, "estoque min.", "estoque minimo", "estoque mínimo"))),
        maxStock: Math.max(0, number(find(row, "estoque max.", "estoque maximo", "estoque máximo"))),
        location: text(find(row, "localizacao", "localização")) || undefined,
        ncm: text(find(row, "ncm")) || undefined,
        cest: text(find(row, "cest")) || undefined,
        defaultCfop: text(find(row, "tributacao", "tributação")) .match(/\b\d{4}\b/)?.[0],
        fiscalItemType: "GOOD",
        fiscalApproved: false
      });
    });
    const result = await prisma.$transaction(async (tx) => {
      let imported = 0;
      for (const item of data) {
        const duplicate = await tx.product.findFirst({ where: { tenantId: session.user.currentTenantId, OR: [item.code ? { code: item.code } : undefined, item.sku ? { sku: item.sku } : undefined, item.barcode ? { barcode: item.barcode } : undefined].filter(Boolean) as object[] } });
        if (duplicate) continue;
        const margin = item.costPrice > 0 ? ((item.salePrice - item.costPrice) / item.costPrice) * 100 : 0;
        await tx.product.create({ data: { ...item, tenantId: session.user.currentTenantId, marginPercent: margin, branchStocks: { create: { tenantId: session.user.currentTenantId, branchId, stockQuantity: item.stockQuantity, minStock: item.minStock, maxStock: item.maxStock, location: item.location } } } });
        imported += 1;
      }
      return { imported, skipped: data.length - imported, total: data.length };
    });
    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}
