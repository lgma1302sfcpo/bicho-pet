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
const categoryNames: Record<string, string> = {
  acessorios: "Acessórios", aves: "Aves", "banho e tosa": "Banho e Tosa", doces: "Doces", granel: "Granel",
  higiene: "Higiene", jardinagem: "Jardinagem", medicacao: "Medicação", "medicamentos / suplementos": "Medicamentos/Suplementos",
  "medicamentos/suplementos": "Medicamentos/Suplementos", pacoteira: "Pacoteira", petisco: "Petisco", roedores: "Roedores",
  sacaria: "Sacaria", servico: "Serviço"
};
const category = (value: unknown) => {
  const original = text(value);
  return categoryNames[normalized(original)] ?? original;
};

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
    const data: Array<{ item: ReturnType<typeof createProductSchema.parse>; provided: Set<string> }> = [];
    let invalid = 0;
    let duplicateRows = 0;
    rows.forEach((row) => {
      const code = text(find(row, "codigo", "código")) || undefined;
      const sku = text(find(row, "codigo ref.", "codigo ref", "sku")) || undefined;
      const barcode = text(find(row, "ean / gtin", "ean", "gtin", "codigo extra")) || undefined;
      const identifiers = [["código", code], ["SKU", sku], ["código de barras", barcode]] as const;
      if (identifiers.some(([label, value]) => value && seen.has(`${label}:${value}`))) {
        duplicateRows += 1;
        return;
      }
      identifiers.forEach(([label, value]) => { if (value) seen.add(`${label}:${value}`); });
      try {
        const raw = {
          name: find(row, "nome", "produto"),
          category: find(row, "categoria"),
          subcategory: find(row, "sub categoria", "subcategoria"),
          brand: find(row, "marca"),
          supplier: find(row, "fornecedor principal", "fornecedor"),
          unit: find(row, "unidade", "unid.", "unid"),
          costPrice: find(row, "preco de custo", "preço de custo", "custo"),
          salePrice: find(row, "preco", "preço", "preco de venda", "preço de venda"),
          stockQuantity: find(row, "estoque atual", "estoque"),
          minStock: find(row, "estoque min.", "estoque minimo", "estoque mínimo"),
          maxStock: find(row, "estoque max.", "estoque maximo", "estoque máximo"),
          location: find(row, "localizacao", "localização")
        };
        const provided = new Set(Object.entries(raw).filter(([, value]) => text(value) !== "").map(([key]) => key));
        data.push({ item: createProductSchema.parse({
        name: text(raw.name),
        code, sku, barcode,
        category: category(raw.category) || "Sem categoria",
        subcategory: text(raw.subcategory) || undefined,
        brand: text(raw.brand) || undefined,
        supplier: text(raw.supplier) || undefined,
        unit: text(raw.unit).toUpperCase() || "UN",
        costPrice: number(raw.costPrice),
        salePrice: number(raw.salePrice),
        stockQuantity: Math.max(0, number(raw.stockQuantity)),
        minStock: Math.max(0, number(raw.minStock)),
        maxStock: Math.max(0, number(raw.maxStock)),
        location: text(raw.location) || undefined,
        ncm: text(find(row, "ncm")) || undefined,
        cest: text(find(row, "cest")) || undefined,
        defaultCfop: text(find(row, "tributacao", "tributação")) .match(/\b\d{4}\b/)?.[0],
        fiscalItemType: "GOOD",
        fiscalApproved: false
        }), provided });
      } catch {
        invalid += 1;
      }
    });
    if (!data.length) throw new Error("Nenhum produto válido foi encontrado na planilha.");
    const identifiers = data.flatMap(({ item }) => [item.code ? { code: item.code } : null, item.sku ? { sku: item.sku } : null, item.barcode ? { barcode: item.barcode } : null]).filter(Boolean) as object[];
    const existing = await prisma.product.findMany({
      where: { tenantId: session.user.currentTenantId, ...(identifiers.length ? { OR: identifiers } : { id: "__none__" }) },
      select: { id: true, code: true, sku: true, barcode: true, costPrice: true, salePrice: true }
    });
    const existingByIdentifier = new Map(existing.flatMap((item) => [item.code, item.sku, item.barcode].filter(Boolean).map((value) => [String(value), item] as const)));
    const pending = data.filter(({ item }) => ![item.code, item.sku, item.barcode].filter(Boolean).some((value) => existingByIdentifier.has(String(value))));
    const updates = data.flatMap((entry) => {
      const product = [entry.item.code, entry.item.sku, entry.item.barcode].filter(Boolean).map(String).map((value) => existingByIdentifier.get(value)).find(Boolean);
      return product ? [{ ...entry, product }] : [];
    });
    const result = await prisma.$transaction(async (tx) => {
      const productRows = pending.map(({ item }) => {
        const margin = item.costPrice > 0 ? ((item.salePrice - item.costPrice) / item.costPrice) * 100 : 0;
        return { ...item, tenantId: session.user.currentTenantId, marginPercent: margin };
      });
      const inserted = await tx.product.createManyAndReturn({ data: productRows, select: { id: true, stockQuantity: true, minStock: true, maxStock: true, location: true } });
      await tx.productBranchStock.createMany({ data: inserted.map((item) => ({ tenantId: session.user.currentTenantId, branchId, productId: item.id, stockQuantity: item.stockQuantity, minStock: item.minStock, maxStock: item.maxStock, location: item.location })) });
      for (const { item, provided, product } of updates) {
        const nextCost = provided.has("costPrice") ? item.costPrice : Number(product.costPrice);
        const nextSale = provided.has("salePrice") ? item.salePrice : Number(product.salePrice);
        await tx.product.update({ where: { id: product.id }, data: {
          ...(provided.has("name") ? { name: item.name } : {}), ...(provided.has("category") ? { category: item.category } : {}),
          ...(provided.has("subcategory") ? { subcategory: item.subcategory } : {}), ...(provided.has("brand") ? { brand: item.brand } : {}),
          ...(provided.has("supplier") ? { supplier: item.supplier } : {}), ...(provided.has("unit") ? { unit: item.unit } : {}),
          ...(provided.has("costPrice") ? { costPrice: item.costPrice } : {}), ...(provided.has("salePrice") ? { salePrice: item.salePrice } : {}),
          ...(provided.has("stockQuantity") ? { stockQuantity: item.stockQuantity } : {}), ...(provided.has("minStock") ? { minStock: item.minStock } : {}),
          ...(provided.has("maxStock") ? { maxStock: item.maxStock } : {}), ...(provided.has("location") ? { location: item.location } : {}),
          marginPercent: nextCost > 0 ? ((nextSale - nextCost) / nextCost) * 100 : 0
        } });
        if (["stockQuantity", "minStock", "maxStock", "location"].some((field) => provided.has(field))) {
          await tx.productBranchStock.upsert({
            where: { branchId_productId: { branchId, productId: product.id } },
            create: { tenantId: session.user.currentTenantId, branchId, productId: product.id, stockQuantity: item.stockQuantity, minStock: item.minStock, maxStock: item.maxStock, location: item.location },
            update: { ...(provided.has("stockQuantity") ? { stockQuantity: item.stockQuantity } : {}), ...(provided.has("minStock") ? { minStock: item.minStock } : {}), ...(provided.has("maxStock") ? { maxStock: item.maxStock } : {}), ...(provided.has("location") ? { location: item.location } : {}) }
          });
        }
      }
      return { inserted: inserted.length, updated: updates.length };
    }, { timeout: 240000, maxWait: 15000 });
    const resultData = { imported: result.inserted, updated: result.updated, skipped: 0, failed: 0, failures: [], total: rows.length, duplicateRows, invalidRows: invalid };
    return created(resultData);
  } catch (error) {
    return errorResponse(error);
  }
}
