import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductRepository } from "@/interfaces/catalog/product-repository.interface";
import { ProductService } from "@/services/catalog/product.service";

function createRepositoryMock(): ProductRepository {
  return {
    productIdentifierExists: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    listProducts: vi.fn(),
    getProductSummary: vi.fn()
  };
}

describe("ProductService", () => {
  let repository: ProductRepository;
  let service: ProductService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new ProductService(repository);
    vi.clearAllMocks();
  });

  it("calcula margem ao cadastrar produto", async () => {
    vi.mocked(repository.productIdentifierExists).mockResolvedValue(null);
    vi.mocked(repository.createProduct).mockImplementation(async (_tenantId, _branchId, data) => ({
      id: "product-1",
      name: data.name,
      code: data.code,
      sku: data.sku,
      barcode: data.barcode,
      category: data.category,
      brand: data.brand,
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
      imageUrl: data.imageUrl,
      status: "ACTIVE"
    }));

    const result = await service.createProduct("tenant-1", "branch-1", {
      name: "Racao Premium 10kg",
      code: "RAC-10",
      category: "Racao",
      unit: "UN",
      species: "DOG",
      costPrice: 100,
      salePrice: 150,
      useBranchPrice: false,
      stockQuantity: 4,
      minStock: 5,
      maxStock: 20
    });

    expect(repository.createProduct).toHaveBeenCalledWith(
      "tenant-1",
      "branch-1",
      expect.objectContaining({ marginPercent: 50 })
    );
    expect(result.isLowStock).toBe(true);
  });

  it("bloqueia codigo duplicado", async () => {
    vi.mocked(repository.productIdentifierExists).mockResolvedValue("codigo");

    await expect(
      service.createProduct("tenant-1", "branch-1", {
        name: "Petisco",
        code: "PET-1",
        category: "Petisco",
        unit: "UN",
        species: "ALL",
        costPrice: 5,
        salePrice: 9,
        useBranchPrice: false,
        stockQuantity: 10,
        minStock: 2,
        maxStock: 20
      })
    ).rejects.toMatchObject({ code: "PRODUCT_IDENTIFIER_EXISTS" });
  });

  it("edita produto e recalcula a margem", async () => {
    vi.mocked(repository.productIdentifierExists).mockResolvedValue(null);
    vi.mocked(repository.updateProduct).mockImplementation(async (_tenantId, _branchId, _productId, data) => ({
      id: "product-1",
      ...data
    }));

    const result = await service.updateProduct("tenant-1", "branch-1", "product-1", {
      name: "Racao Premium Editada",
      code: "RAC-10",
      category: "Racao",
      unit: "UN",
      species: "DOG",
      costPrice: 80,
      salePrice: 120,
      useBranchPrice: false,
      stockQuantity: 8,
      minStock: 3,
      maxStock: 20,
      status: "ACTIVE"
    });

    expect(repository.productIdentifierExists).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ code: "RAC-10" }),
      "product-1"
    );
    expect(result.marginPercent).toBe(50);
  });

  it("exclui produto somente do tenant informado", async () => {
    vi.mocked(repository.deleteProduct).mockResolvedValue(true);
    await expect(service.deleteProduct("tenant-1", "product-1")).resolves.toBeUndefined();
    expect(repository.deleteProduct).toHaveBeenCalledWith("tenant-1", "product-1");
  });

  it("pesquisa produtos ativos no banco sem limitar ao primeiro lote da listagem", async () => {
    vi.mocked(repository.listProducts).mockResolvedValue([{
      id: "golden-1",
      name: "Golden cães adultos pequeno porte",
      code: "001009",
      category: "Sacaria",
      unit: "UN",
      species: "DOG",
      costPrice: 15,
      salePrice: 22.5,
      marginPercent: 50,
      stockQuantity: -2,
      minStock: 0,
      maxStock: 0,
      status: "ACTIVE"
    }]);

    const result = await service.searchProducts("tenant-1", "branch-1", "golden");

    expect(repository.listProducts).toHaveBeenCalledWith("tenant-1", "branch-1", {
      search: "golden",
      status: "ACTIVE",
      lowStockOnly: false
    });
    expect(repository.getProductSummary).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ name: "Golden cães adultos pequeno porte", salePrice: 22.5 });
  });

  it("devolve todos os produtos encontrados pela busca", async () => {
    vi.mocked(repository.listProducts).mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({
      id: `origens-${index}`,
      name: `Origens cães adultos ${index}`,
      code: `G${index}`,
      category: "Racao",
      unit: "KG",
      species: "DOG",
      costPrice: 10,
      salePrice: 14,
      marginPercent: 40,
      stockQuantity: 1,
      minStock: 0,
      maxStock: 0,
      status: "ACTIVE"
    })));

    const result = await service.searchProducts("tenant-1", "branch-1", "origens cães");

    expect(result).toHaveLength(25);
  });
});
