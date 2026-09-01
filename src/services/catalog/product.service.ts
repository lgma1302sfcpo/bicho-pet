import type {
  CreateProductDTO,
  ProductFiltersDTO,
  ProductListItemDTO,
  ProductSummaryDTO,
  UpdateProductDTO
} from "@/dtos/catalog/product.dto";
import type { ProductRecord, ProductRepository } from "@/interfaces/catalog/product-repository.interface";
import { AppError } from "@/lib/errors";

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async createProduct(tenantId: string, branchId: string, input: CreateProductDTO): Promise<ProductListItemDTO> {
    const duplicatedField = await this.repository.productIdentifierExists(tenantId, {
      code: input.code,
      sku: input.sku,
      barcode: input.barcode
    });

    if (duplicatedField) {
      throw new AppError(`Já existe um produto com este ${duplicatedField}.`, "PRODUCT_IDENTIFIER_EXISTS", 409);
    }

    const product = await this.repository.createProduct(tenantId, branchId, {
      ...input,
      marginPercent: this.calculateMargin(input.costPrice, input.salePrice)
    });

    return this.mapProduct(product);
  }

  async listProducts(tenantId: string, branchId: string | null, filters: ProductFiltersDTO) {
    const [products, summary] = await Promise.all([
      this.repository.listProducts(tenantId, branchId, filters),
      this.repository.getProductSummary(tenantId, branchId)
    ]);

    return {
      products: products.map((product) => this.mapProduct(product)),
      summary: summary satisfies ProductSummaryDTO
    };
  }

  async searchProducts(tenantId: string, branchId: string | null, search: string): Promise<ProductListItemDTO[]> {
    const products = await this.repository.listProducts(tenantId, branchId, {
      search,
      status: "ACTIVE",
      lowStockOnly: false
    });

    return products.map((product) => this.mapProduct(product));
  }

  async updateProduct(tenantId: string, branchId: string, productId: string, input: UpdateProductDTO): Promise<ProductListItemDTO> {
    const duplicatedField = await this.repository.productIdentifierExists(
      tenantId,
      { code: input.code, sku: input.sku, barcode: input.barcode },
      productId
    );

    if (duplicatedField) {
      throw new AppError(`Já existe um produto com este ${duplicatedField}.`, "PRODUCT_IDENTIFIER_EXISTS", 409);
    }

    const product = await this.repository.updateProduct(tenantId, branchId, productId, {
      ...input,
      marginPercent: this.calculateMargin(input.costPrice, input.salePrice)
    });

    if (!product) {
      throw new AppError("Produto não encontrado.", "PRODUCT_NOT_FOUND", 404);
    }

    return this.mapProduct(product);
  }

  async deleteProduct(tenantId: string, productId: string) {
    const deleted = await this.repository.deleteProduct(tenantId, productId);

    if (!deleted) {
      throw new AppError("Produto não encontrado.", "PRODUCT_NOT_FOUND", 404);
    }
  }

  private mapProduct(product: ProductRecord): ProductListItemDTO {
    return {
      ...product,
      fiscalItemType: product.fiscalItemType ?? "GOOD",
      fiscalApproved: product.fiscalApproved ?? false,
      isLowStock: product.minStock > 0 && product.stockQuantity <= product.minStock
    };
  }

  private calculateMargin(costPrice: number, salePrice: number) {
    if (costPrice <= 0) {
      return 0;
    }

    return Math.round(((salePrice - costPrice) / costPrice) * 10000) / 100;
  }
}
