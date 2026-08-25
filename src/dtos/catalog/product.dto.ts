import { z } from "zod";

import { createProductSchema, productFiltersSchema, updateProductSchema } from "@/schemas/catalog/product.schemas";

type CreateProductOutput = z.infer<typeof createProductSchema>;
type UpdateProductOutput = z.infer<typeof updateProductSchema>;
export type CreateProductDTO = Omit<CreateProductOutput, "fiscalItemType" | "fiscalApproved"> &
  Partial<Pick<CreateProductOutput, "fiscalItemType" | "fiscalApproved">>;
export type UpdateProductDTO = Omit<UpdateProductOutput, "fiscalItemType" | "fiscalApproved"> &
  Partial<Pick<UpdateProductOutput, "fiscalItemType" | "fiscalApproved">>;
export type ProductFiltersDTO = z.infer<typeof productFiltersSchema>;

export type ProductListItemDTO = {
  id: string;
  name: string;
  code?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  supplier?: string | null;
  unit: string;
  species: string;
  description?: string | null;
  costPrice: number;
  salePrice: number;
  marginPercent: number;
  stockQuantity: number;
  minStock: number;
  maxStock: number;
  location?: string | null;
  imageUrl?: string | null;
  fiscalItemType: string;
  ncm?: string | null;
  cest?: string | null;
  originCode?: string | null;
  defaultCfop?: string | null;
  icmsCode?: string | null;
  pisCode?: string | null;
  cofinsCode?: string | null;
  ibsCbsCode?: string | null;
  taxClassificationCode?: string | null;
  serviceCode?: string | null;
  issRate?: number | null;
  fiscalApproved: boolean;
  status: string;
  isLowStock: boolean;
};

export type ProductSummaryDTO = {
  totalProducts: number;
  lowStock: number;
  activeProducts: number;
  categories: string[];
};
