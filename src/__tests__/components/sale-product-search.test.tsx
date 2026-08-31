import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SaleCreatePage } from "@/components/sales/sale-create-page";
import type { ProductListItemDTO } from "@/dtos/catalog/product.dto";
import { useProductSearches } from "@/hooks/catalog/use-products";
import { useCreateSale, useCustomers, useSales } from "@/hooks/commerce/use-commerce";

vi.stubGlobal("React", React);

vi.mock("@/components/customers/customer-create-form", () => ({ CustomerCreateForm: () => null }));
vi.mock("@/hooks/catalog/use-products", () => ({ useProductSearches: vi.fn() }));
vi.mock("@/hooks/commerce/use-commerce", () => ({
  useCustomers: vi.fn(),
  useSales: vi.fn(),
  useCreateSale: vi.fn(),
  useCreateCustomer: vi.fn(),
  useUpdateCustomer: vi.fn()
}));

const golden: ProductListItemDTO = {
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
  fiscalItemType: "GOOD",
  fiscalApproved: false,
  status: "ACTIVE",
  isLowStock: false
};

describe("busca de produtos na venda", () => {
  it("consulta e exibe produtos que não estão no primeiro lote da listagem", async () => {
    vi.mocked(useCustomers).mockReturnValue({
      data: { customers: [], summary: {} },
      isPending: false,
      isError: false
    } as unknown as ReturnType<typeof useCustomers>);
    vi.mocked(useSales).mockReturnValue({ data: [], isPending: false, isFetching: false } as unknown as ReturnType<typeof useSales>);
    vi.mocked(useCreateSale).mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as unknown as ReturnType<typeof useCreateSale>);
    vi.mocked(useProductSearches).mockImplementation((searches) => ([{
      data: searches[0] === "golden" ? [golden] : undefined,
      isFetching: false,
      isError: false
    }] as unknown as ReturnType<typeof useProductSearches>));

    render(<SaleCreatePage />);
    fireEvent.change(screen.getByPlaceholderText("Digite nome, código, SKU ou código de barras"), {
      target: { value: "golden" }
    });

    await waitFor(() => expect(screen.getByText(/Golden cães adultos pequeno porte/)).toBeInTheDocument(), { timeout: 1500 });
    expect(screen.getByRole("button", { name: /Golden cães adultos pequeno porte/ })).toBeInTheDocument();
    expect(screen.queryByText("Carregando produtos e saldos de estoque...")).not.toBeInTheDocument();
  });
});
