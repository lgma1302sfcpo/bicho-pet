import type { Prisma, PrismaClient } from "@prisma/client";

import type { CreateProductDTO, ProductFiltersDTO, UpdateProductDTO } from "@/dtos/catalog/product.dto";
import type { ProductRepository } from "@/interfaces/catalog/product-repository.interface";
import { prisma } from "@/lib/prisma";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async productIdentifierExists(
    tenantId: string,
    identifiers: Pick<CreateProductDTO, "code" | "sku" | "barcode">,
    excludeProductId?: string
  ) {
    const checks: Prisma.ProductWhereInput[] = [];

    if (identifiers.code) {
      checks.push({ code: identifiers.code });
    }

    if (identifiers.sku) {
      checks.push({ sku: identifiers.sku });
    }

    if (identifiers.barcode) {
      checks.push({ barcode: identifiers.barcode });
    }

    if (checks.length === 0) {
      return null;
    }

    const product = await this.db.product.findFirst({
      where: {
        tenantId,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
        OR: checks
      },
      select: {
        code: true,
        sku: true,
        barcode: true
      }
    });

    if (!product) {
      return null;
    }

    if (identifiers.code && product.code === identifiers.code) {
      return "codigo";
    }

    if (identifiers.sku && product.sku === identifiers.sku) {
      return "SKU";
    }

    return "codigo de barras";
  }

  async createProduct(tenantId: string, branchId: string, data: CreateProductDTO & { marginPercent: number }) {
    const product = await this.db.product.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        sku: data.sku,
        barcode: data.barcode,
        category: data.category,
        subcategory: data.subcategory,
        brand: data.brand,
        supplier: data.supplier,
        unit: data.unit,
        species: data.species,
        description: data.description,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        marginPercent: data.marginPercent,
        stockQuantity: data.stockQuantity,
        minStock: data.minStock,
        maxStock: data.maxStock,
        location: data.location,
        imageUrl: data.imageUrl
        ,fiscalItemType: data.fiscalItemType ?? "GOOD"
        ,ncm: data.ncm
        ,cest: data.cest
        ,originCode: data.originCode
        ,defaultCfop: data.defaultCfop
        ,icmsCode: data.icmsCode
        ,pisCode: data.pisCode
        ,cofinsCode: data.cofinsCode
        ,ibsCbsCode: data.ibsCbsCode
        ,taxClassificationCode: data.taxClassificationCode
        ,serviceCode: data.serviceCode
        ,issRate: data.issRate
        ,fiscalApproved: data.fiscalApproved ?? false
        ,branchStocks: {
          create: {
            tenantId,
            branchId,
            stockQuantity: data.stockQuantity,
            minStock: data.minStock,
            maxStock: data.maxStock,
            location: data.location
          }
        }
      },
      include: { branchStocks: { where: { branchId } } }
    });

    return this.mapProduct(product);
  }

  async updateProduct(
    tenantId: string,
    branchId: string,
    productId: string,
    data: UpdateProductDTO & { marginPercent: number }
  ) {
    const updated = await this.db.$transaction(async (transaction) => {
      const result = await transaction.product.updateMany({
        where: { id: productId, tenantId },
        data: {
        name: data.name,
        code: data.code ?? null,
        sku: data.sku ?? null,
        barcode: data.barcode ?? null,
        category: data.category,
        subcategory: data.subcategory ?? null,
        brand: data.brand ?? null,
        supplier: data.supplier ?? null,
        unit: data.unit,
        species: data.species,
        description: data.description ?? null,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        marginPercent: data.marginPercent,
        imageUrl: data.imageUrl ?? null,
        fiscalItemType: data.fiscalItemType,
        ncm: data.ncm ?? null,
        cest: data.cest ?? null,
        originCode: data.originCode ?? null,
        defaultCfop: data.defaultCfop ?? null,
        icmsCode: data.icmsCode ?? null,
        pisCode: data.pisCode ?? null,
        cofinsCode: data.cofinsCode ?? null,
        ibsCbsCode: data.ibsCbsCode ?? null,
        taxClassificationCode: data.taxClassificationCode ?? null,
        serviceCode: data.serviceCode ?? null,
        issRate: data.issRate ?? null,
        fiscalApproved: data.fiscalApproved,
        status: data.status
        }
      });

      if (result.count > 0) {
        await transaction.productBranchStock.upsert({
          where: { branchId_productId: { branchId, productId } },
          create: {
            tenantId,
            branchId,
            productId,
            stockQuantity: data.stockQuantity,
            minStock: data.minStock,
            maxStock: data.maxStock,
            location: data.location ?? null
          },
          update: {
            stockQuantity: data.stockQuantity,
            minStock: data.minStock,
            maxStock: data.maxStock,
            location: data.location ?? null
          }
        });
      }

      return result;
    });

    if (updated.count === 0) {
      return null;
    }

    const product = await this.db.product.findFirst({
      where: { id: productId, tenantId },
      include: { branchStocks: { where: { branchId } } }
    });
    return product ? this.mapProduct(product) : null;
  }

  async deleteProduct(tenantId: string, productId: string) {
    const deleted = await this.db.product.updateMany({ where: { id: productId, tenantId }, data: { status: "DISCONTINUED" } });
    return deleted.count > 0;
  }

  async listProducts(tenantId: string, branchId: string | null, filters: ProductFiltersDTO) {
    const and: Prisma.ProductWhereInput[] = [{ tenantId }];

    if (filters.search) {
      and.push({
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { code: { contains: filters.search, mode: "insensitive" } },
          { sku: { contains: filters.search, mode: "insensitive" } },
          { barcode: { contains: filters.search } },
          { brand: { contains: filters.search, mode: "insensitive" } },
          { supplier: { contains: filters.search, mode: "insensitive" } },
          { subcategory: { contains: filters.search, mode: "insensitive" } }
        ]
      });
    }

    if (filters.category) {
      and.push({ category: filters.category });
    }

    if (filters.supplier) {
      and.push({ supplier: filters.supplier });
    }

    if (filters.species) {
      and.push({ species: filters.species });
    }

    if (filters.status) {
      and.push({ status: filters.status });
    } else {
      and.push({ status: { not: "DISCONTINUED" } });
    }

    const products = await this.db.product.findMany({
      where: { AND: and },
      include: { branchStocks: { where: branchId ? { branchId } : {} } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 300
    });

    return products
      .map((product) => this.mapProduct(product))
      .filter((product) => {
        if (!filters.lowStockOnly) {
          return true;
        }

        return toNumber(product.minStock) > 0 && toNumber(product.stockQuantity) <= toNumber(product.minStock);
      });
  }

  async getProductSummary(tenantId: string, branchId: string | null) {
    const [products, totalProducts, activeProducts] = await Promise.all([
      this.db.product.findMany({
        where: { tenantId, status: { not: "DISCONTINUED" } },
        select: {
          category: true,
          supplier: true,
          branchStocks: { where: branchId ? { branchId } : {}, select: { stockQuantity: true, minStock: true } }
        }
      }),
      this.db.product.count({ where: { tenantId, status: { not: "DISCONTINUED" } } }),
      this.db.product.count({ where: { tenantId, status: "ACTIVE" } })
    ]);

    return {
      totalProducts,
      activeProducts,
      lowStock: products.filter((product) => {
        if (branchId) {
          const stock = product.branchStocks[0];
          return Boolean(stock && toNumber(stock.minStock) > 0 && toNumber(stock.stockQuantity) <= toNumber(stock.minStock));
        }
        return product.branchStocks.some((stock) => toNumber(stock.minStock) > 0 && toNumber(stock.stockQuantity) <= toNumber(stock.minStock));
      }).length,
      categories: Array.from(new Set(products.map((product) => product.category))).sort(),
      suppliers: Array.from(new Set(products.map((product) => product.supplier).filter((supplier): supplier is string => Boolean(supplier)))).sort()
    };
  }

  private mapProduct(product: {
    id: string;
    name: string;
    code: string | null;
    sku: string | null;
    barcode: string | null;
    category: string;
    subcategory: string | null;
    brand: string | null;
    supplier: string | null;
    unit: string;
    species: string;
    description: string | null;
    costPrice: Prisma.Decimal;
    salePrice: Prisma.Decimal;
    marginPercent: Prisma.Decimal;
    stockQuantity: Prisma.Decimal;
    minStock: Prisma.Decimal;
    maxStock: Prisma.Decimal;
    location: string | null;
    imageUrl: string | null;
    fiscalItemType: string;
    ncm: string | null;
    cest: string | null;
    originCode: string | null;
    defaultCfop: string | null;
    icmsCode: string | null;
    pisCode: string | null;
    cofinsCode: string | null;
    ibsCbsCode: string | null;
    taxClassificationCode: string | null;
    serviceCode: string | null;
    issRate: Prisma.Decimal | null;
    fiscalApproved: boolean;
    status: string;
    branchStocks?: Array<{
      stockQuantity: Prisma.Decimal;
      minStock: Prisma.Decimal;
      maxStock: Prisma.Decimal;
      location: string | null;
    }>;
  }) {
    const stocks = product.branchStocks ?? [];
    const branchStock = {
      stockQuantity: stocks.reduce((total, stock) => total + toNumber(stock.stockQuantity), 0),
      minStock: stocks.reduce((total, stock) => total + toNumber(stock.minStock), 0),
      maxStock: stocks.reduce((total, stock) => total + toNumber(stock.maxStock), 0),
      location: stocks.length === 1 ? stocks[0].location : null
    };
    return {
      id: product.id,
      name: product.name,
      code: product.code,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      supplier: product.supplier,
      unit: product.unit,
      species: product.species,
      description: product.description,
      costPrice: toNumber(product.costPrice),
      salePrice: toNumber(product.salePrice),
      marginPercent: toNumber(product.marginPercent),
      stockQuantity: branchStock.stockQuantity,
      minStock: branchStock.minStock,
      maxStock: branchStock.maxStock,
      location: branchStock.location,
      imageUrl: product.imageUrl,
      fiscalItemType: product.fiscalItemType,
      ncm: product.ncm,
      cest: product.cest,
      originCode: product.originCode,
      defaultCfop: product.defaultCfop,
      icmsCode: product.icmsCode,
      pisCode: product.pisCode,
      cofinsCode: product.cofinsCode,
      ibsCbsCode: product.ibsCbsCode,
      taxClassificationCode: product.taxClassificationCode,
      serviceCode: product.serviceCode,
      issRate: product.issRate === null ? null : toNumber(product.issRate),
      fiscalApproved: product.fiscalApproved,
      status: product.status
    };
  }
}
