import type { CreateProductDTO, ProductFiltersDTO, UpdateProductDTO } from "@/dtos/catalog/product.dto";

export type ProductRecord = {
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
  fiscalItemType?: string;
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
  fiscalApproved?: boolean;
  status: string;
};

export type ProductSummaryRecord = {
  totalProducts: number;
  lowStock: number;
  activeProducts: number;
  categories: string[];
};

export interface ProductRepository {
  productIdentifierExists(
    tenantId: string,
    identifiers: Pick<CreateProductDTO, "code" | "sku" | "barcode">,
    excludeProductId?: string
  ): Promise<string | null>;
  createProduct(
    tenantId: string,
    branchId: string,
    data: CreateProductDTO & { marginPercent: number }
  ): Promise<ProductRecord>;
  updateProduct(
    tenantId: string,
    branchId: string,
    productId: string,
    data: UpdateProductDTO & { marginPercent: number }
  ): Promise<ProductRecord | null>;
  deleteProduct(tenantId: string, productId: string): Promise<boolean>;
  listProducts(tenantId: string, branchId: string | null, filters: ProductFiltersDTO): Promise<ProductRecord[]>;
  getProductSummary(tenantId: string, branchId: string | null): Promise<ProductSummaryRecord>;
}
