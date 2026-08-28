import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

import { created, errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/schemas/catalog/product.schemas";

export const maxDuration = 300;

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

const chunks = <T,>(items: T[], size = 300) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.PRODUCTS_WRITE);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const form = await request.formData();
    const file = form.get("file");
    const stockFile = form.get("stockFile");
    if (!(file instanceof File)) throw new Error("Selecione a planilha de produtos ou de estoque.");
    const inputFiles = [file, ...(stockFile instanceof File ? [stockFile] : [])];
    const sourceRows: Array<Record<string, unknown>> = [];
    for (const inputFile of inputFiles) {
      const workbook = XLSX.read(Buffer.from(await inputFile.arrayBuffer()), { type: "buffer", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      sourceRows.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }));
    }
    const rowValue = (row: Record<string, unknown>, ...names: string[]) => {
      const entry = Object.entries(row).find(([key]) => names.includes(normalized(key)));
      return entry?.[1];
    };
    const mergedRows = new Map<string, Record<string, unknown>>();
    sourceRows.forEach((row, index) => {
      const identity = text(rowValue(row, "codigo", "código")) || text(rowValue(row, "codigo ref.", "codigo ref", "sku")) || text(rowValue(row, "ean / gtin", "ean", "gtin", "codigo extra")) || normalized(text(rowValue(row, "nome", "produto"))) || `linha-${index}`;
      const current = mergedRows.get(identity) ?? {};
      for (const [key, value] of Object.entries(row)) {
        if (text(value) !== "" || !(key in current)) current[key] = value;
      }
      mergedRows.set(identity, current);
    });
    const rows = Array.from(mergedRows.values());
    if (!rows.length) throw new Error("A planilha não possui produtos.");
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
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
    const productRows = pending.map(({ item }) => {
      const margin = item.costPrice > 0 ? ((item.salePrice - item.costPrice) / item.costPrice) * 100 : 0;
      return { ...item, tenantId: session.user.currentTenantId, marginPercent: margin };
    });
    const inserted = await prisma.product.createManyAndReturn({ data: productRows, select: { id: true, stockQuantity: true, minStock: true, maxStock: true, location: true } });
    if (inserted.length) {
      await prisma.productBranchStock.createMany({
        data: inserted.map((item) => ({ tenantId: session.user.currentTenantId, branchId, productId: item.id, stockQuantity: item.stockQuantity, minStock: item.minStock, maxStock: item.maxStock, location: item.location })),
        skipDuplicates: true
      });
    }

    // As atualizações são enviadas ao PostgreSQL em lotes. Fazer um update por
    // produto mantinha uma transação aberta por minutos e estourava o limite da produção.
    for (const batch of chunks(updates)) {
      const values = batch.map(({ item, provided, product }) => {
        const nextCost = provided.has("costPrice") ? item.costPrice : Number(product.costPrice);
        const nextSale = provided.has("salePrice") ? item.salePrice : Number(product.salePrice);
        const margin = nextCost > 0 ? ((nextSale - nextCost) / nextCost) * 100 : 0;
        return Prisma.sql`(${product.id}::text, ${item.name}::text, ${provided.has("name")}::boolean, ${item.category}::text, ${provided.has("category")}::boolean, ${item.subcategory ?? null}::text, ${provided.has("subcategory")}::boolean, ${item.brand ?? null}::text, ${provided.has("brand")}::boolean, ${item.supplier ?? null}::text, ${provided.has("supplier")}::boolean, ${item.unit}::text, ${provided.has("unit")}::boolean, ${item.costPrice}::numeric, ${provided.has("costPrice")}::boolean, ${item.salePrice}::numeric, ${provided.has("salePrice")}::boolean, ${item.stockQuantity}::numeric, ${provided.has("stockQuantity")}::boolean, ${item.minStock}::numeric, ${provided.has("minStock")}::boolean, ${item.maxStock}::numeric, ${provided.has("maxStock")}::boolean, ${item.location ?? null}::text, ${provided.has("location")}::boolean, ${margin}::numeric)`;
      });
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "products" AS p SET
          "name" = CASE WHEN v.name_set THEN v.name ELSE p."name" END,
          "category" = CASE WHEN v.category_set THEN v.category ELSE p."category" END,
          "subcategory" = CASE WHEN v.subcategory_set THEN v.subcategory ELSE p."subcategory" END,
          "brand" = CASE WHEN v.brand_set THEN v.brand ELSE p."brand" END,
          "supplier" = CASE WHEN v.supplier_set THEN v.supplier ELSE p."supplier" END,
          "unit" = CASE WHEN v.unit_set THEN v.unit ELSE p."unit" END,
          "costPrice" = CASE WHEN v.cost_set THEN v.cost ELSE p."costPrice" END,
          "salePrice" = CASE WHEN v.sale_set THEN v.sale ELSE p."salePrice" END,
          "stockQuantity" = CASE WHEN v.stock_set THEN v.stock ELSE p."stockQuantity" END,
          "minStock" = CASE WHEN v.min_set THEN v.min_stock ELSE p."minStock" END,
          "maxStock" = CASE WHEN v.max_set THEN v.max_stock ELSE p."maxStock" END,
          "location" = CASE WHEN v.location_set THEN v.location ELSE p."location" END,
          "marginPercent" = v.margin,
          "updatedAt" = NOW()
        FROM (VALUES ${Prisma.join(values)}) AS v(
          id, name, name_set, category, category_set, subcategory, subcategory_set,
          brand, brand_set, supplier, supplier_set, unit, unit_set, cost, cost_set,
          sale, sale_set, stock, stock_set, min_stock, min_set, max_stock, max_set,
          location, location_set, margin
        )
        WHERE p."id" = v.id
      `);
    }

    const stockUpdates = updates.filter(({ provided }) => ["stockQuantity", "minStock", "maxStock", "location"].some((field) => provided.has(field)));
    if (stockUpdates.length) {
      await prisma.productBranchStock.createMany({
        data: stockUpdates.map(({ item, product }) => ({ tenantId: session.user.currentTenantId, branchId, productId: product.id, stockQuantity: item.stockQuantity, minStock: item.minStock, maxStock: item.maxStock, location: item.location })),
        skipDuplicates: true
      });
      for (const batch of chunks(stockUpdates)) {
        const values = batch.map(({ item, provided, product }) => Prisma.sql`(${product.id}::text, ${item.stockQuantity}::numeric, ${provided.has("stockQuantity")}::boolean, ${item.minStock}::numeric, ${provided.has("minStock")}::boolean, ${item.maxStock}::numeric, ${provided.has("maxStock")}::boolean, ${item.location ?? null}::text, ${provided.has("location")}::boolean)`);
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "product_branch_stocks" AS s SET
            "stockQuantity" = CASE WHEN v.stock_set THEN v.stock ELSE s."stockQuantity" END,
            "minStock" = CASE WHEN v.min_set THEN v.min_stock ELSE s."minStock" END,
            "maxStock" = CASE WHEN v.max_set THEN v.max_stock ELSE s."maxStock" END,
            "location" = CASE WHEN v.location_set THEN v.location ELSE s."location" END,
            "updatedAt" = NOW()
          FROM (VALUES ${Prisma.join(values)}) AS v(product_id, stock, stock_set, min_stock, min_set, max_stock, max_set, location, location_set)
          WHERE s."branchId" = ${branchId} AND s."productId" = v.product_id
        `);
      }
    }

    const resultData = { imported: inserted.length, updated: updates.length, skipped: 0, failed: 0, failures: [], total: rows.length, duplicateRows, invalidRows: invalid };
    return created(resultData);
  } catch (error) {
    return errorResponse(error);
  }
}
