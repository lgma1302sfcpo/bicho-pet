import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/utils";

const money = z.preprocess(parseBrazilianNumber, z.number());
const numeric = z.preprocess(parseBrazilianNumber, z.number());

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalCode = (length: number, label: string) => z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.replace(/\D/g, "") : undefined))
  .refine((value) => !value || value.length === length, `${label} deve possuir ${length} números.`);

const queryBoolean = z.preprocess((value) => {
  if (value === "false" || value === false || value === undefined) {
    return false;
  }

  return value === "true" || value === true;
}, z.boolean());

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto."),
  code: optionalText,
  sku: optionalText,
  barcode: optionalText,
  category: z.string().trim().min(2, "Informe a categoria."),
  subcategory: optionalText,
  brand: optionalText,
  supplier: optionalText,
  unit: z.string().trim().min(1, "Informe a unidade.").default("UN"),
  species: z.enum(["ALL", "DOG", "CAT", "BIRD", "FISH", "RODENT", "OTHER"]).default("ALL"),
  description: optionalText,
  costPrice: money.pipe(z.number().min(0, "O custo não pode ser negativo.")).default(0),
  salePrice: money.pipe(z.number().min(0.01, "O preço de venda deve ser maior que zero.")),
  stockQuantity: numeric.pipe(z.number().min(0, "O estoque não pode ser negativo.")).default(0),
  minStock: numeric.pipe(z.number().min(0, "O estoque mínimo não pode ser negativo.")).default(0),
  maxStock: numeric.pipe(z.number().min(0, "O estoque máximo não pode ser negativo.")).default(0),
  location: optionalText,
  imageUrl: optionalText,
  fiscalItemType: z.enum(["GOOD", "SERVICE"]).default("GOOD"),
  ncm: optionalCode(8, "Nomenclatura Comum do Mercosul"),
  cest: z.string().trim().optional().transform((value) => value ? value.replace(/\D/g, "") : undefined).refine((value) => !value || value.length === 7, "Código Especificador da Substituição Tributária deve possuir 7 números."),
  originCode: optionalText,
  defaultCfop: optionalCode(4, "Código Fiscal de Operações e Prestações"),
  icmsCode: optionalText,
  pisCode: optionalText,
  cofinsCode: optionalText,
  ibsCbsCode: optionalText,
  taxClassificationCode: optionalText,
  serviceCode: optionalText,
  issRate: z.preprocess(
    (value) => value === "" || value === undefined || value === null ? undefined : parseBrazilianNumber(value),
    z.number({ invalid_type_error: "Informe uma alíquota válida." }).min(0, "A alíquota não pode ser negativa.").max(100, "A alíquota não pode ultrapassar 100%." ).optional()
  ),
  fiscalApproved: z.boolean().default(false)
});

export const updateProductSchema = createProductSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"])
});

export const productFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  species: z.enum(["ALL", "DOG", "CAT", "BIRD", "FISH", "RODENT", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  lowStockOnly: queryBoolean.default(false)
});
