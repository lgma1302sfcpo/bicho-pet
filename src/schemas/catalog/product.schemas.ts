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
  .refine((value) => !value || value.length === length, `${label} deve possuir ${length} numeros.`);

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
  costPrice: money.pipe(z.number().min(0, "Custo nao pode ser negativo.")).default(0),
  salePrice: money.pipe(z.number().min(0.01, "Preco de venda deve ser maior que zero.")),
  stockQuantity: numeric.pipe(z.number().min(0, "Estoque nao pode ser negativo.")).default(0),
  minStock: numeric.pipe(z.number().min(0, "Estoque minimo nao pode ser negativo.")).default(0),
  maxStock: numeric.pipe(z.number().min(0, "Estoque maximo nao pode ser negativo.")).default(0),
  location: optionalText,
  imageUrl: optionalText
  ,fiscalItemType: z.enum(["GOOD", "SERVICE"]).default("GOOD")
  ,ncm: optionalCode(8, "Nomenclatura Comum do Mercosul")
  ,cest: z.string().trim().optional().transform((value) => value ? value.replace(/\D/g, "") : undefined).refine((value) => !value || value.length === 7, "Codigo Especificador da Substituicao Tributaria deve possuir 7 numeros.")
  ,originCode: optionalText
  ,defaultCfop: optionalCode(4, "Codigo Fiscal de Operacoes e Prestacoes")
  ,icmsCode: optionalText
  ,pisCode: optionalText
  ,cofinsCode: optionalText
  ,ibsCbsCode: optionalText
  ,taxClassificationCode: optionalText
  ,serviceCode: optionalText
  ,issRate: z.preprocess((value) => value === "" || value === undefined ? undefined : parseBrazilianNumber(value), z.number().min(0).max(100).optional())
  ,fiscalApproved: z.boolean().default(false)
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
