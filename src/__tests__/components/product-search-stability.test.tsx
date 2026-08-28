import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ProductManagementPage } from "@/components/products/product-management-page";
import { useProducts } from "@/hooks/catalog/use-products";

vi.stubGlobal("React", React);

vi.mock("@/hooks/catalog/use-products", () => ({
  useProducts: vi.fn(),
  useDeleteProduct: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useCreateProduct: vi.fn(),
  useUpdateProduct: vi.fn()
}));

const loadedQuery = {
  data: {
    products: [{
      id: "product-1",
      name: "Golden Adultos",
      code: "001",
      sku: null,
      barcode: null,
      category: "Racao",
      subcategory: null,
      brand: "Golden",
      supplier: null,
      unit: "UN",
      species: "DOG",
      description: null,
      costPrice: 10,
      salePrice: 15,
      marginPercent: 50,
      stockQuantity: 2,
      minStock: 1,
      maxStock: 10,
      location: null,
      imageUrl: null,
      fiscalItemType: "GOOD",
      ncm: null,
      cest: null,
      originCode: null,
      defaultCfop: null,
      icmsCode: null,
      pisCode: null,
      cofinsCode: null,
      ibsCbsCode: null,
      taxClassificationCode: null,
      serviceCode: null,
      issRate: null,
      fiscalApproved: false,
      status: "ACTIVE",
      isLowStock: false
    }],
    summary: { totalProducts: 1, activeProducts: 1, lowStock: 0, categories: ["Racao"] }
  },
  isPending: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn()
};

describe("busca na lista de produtos", () => {
  it("mantem o campo e a lista visiveis enquanto o resultado e atualizado", async () => {
    vi.mocked(useProducts).mockReturnValue(loadedQuery as unknown as ReturnType<typeof useProducts>);
    const view = render(<ProductManagementPage />);
    await waitFor(() => expect(screen.getAllByText("Golden Adultos").length).toBeGreaterThan(0));

    vi.mocked(useProducts).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useProducts>);
    view.rerender(<ProductManagementPage />);

    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getAllByText("Golden Adultos").length).toBeGreaterThan(0);
    expect(screen.queryByText("Carregando produtos e saldos de estoque...")).not.toBeInTheDocument();
  });
});
