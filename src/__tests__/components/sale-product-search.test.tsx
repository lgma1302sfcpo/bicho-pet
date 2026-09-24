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
  defaultSalePrice: 22.5,
  useBranchPrice: false,
  marginPercent: 50,
  stockQuantity: -2,
  minStock: 0,
  maxStock: 0,
  fiscalItemType: "GOOD",
  fiscalApproved: false,
  status: "ACTIVE",
  isLowStock: false
};
const createSaleMutation = vi.fn();

function mockPage(product: ProductListItemDTO) {
  createSaleMutation.mockReset();
  createSaleMutation.mockResolvedValue({ id: "sale-1", code: "VEN-1", total: 13 });
  vi.mocked(useCustomers).mockReturnValue({
    data: { customers: [], summary: {} },
    isPending: false,
    isError: false
  } as unknown as ReturnType<typeof useCustomers>);
  vi.mocked(useSales).mockReturnValue({ data: [], isPending: false, isFetching: false } as unknown as ReturnType<typeof useSales>);
  vi.mocked(useCreateSale).mockReturnValue({ isPending: false, mutateAsync: createSaleMutation } as unknown as ReturnType<typeof useCreateSale>);
  vi.mocked(useProductSearches).mockImplementation((searches) => ([{
    data: searches[0] === "golden" ? [product] : undefined,
    isFetching: false,
    isError: false
  }] as unknown as ReturnType<typeof useProductSearches>));
}

describe("busca de produtos na venda", () => {
  it("mantém um desconto independente para cada produto adicionado", async () => {
    mockPage(golden);
    render(<SaleCreatePage />);

    fireEvent.click(screen.getByRole("button", { name: "Item" }));
    const descriptions = screen.getAllByLabelText("Descrição");
    const quantities = screen.getAllByLabelText("Quantidade");
    const prices = screen.getAllByLabelText("Preço unitário");
    const discounts = screen.getAllByLabelText("Desconto do item");

    expect(discounts).toHaveLength(2);
    fireEvent.change(descriptions[0], { target: { value: "Produto A" } });
    fireEvent.change(descriptions[1], { target: { value: "Produto B" } });
    fireEvent.change(quantities[0], { target: { value: "1" } });
    fireEvent.change(quantities[1], { target: { value: "2" } });
    fireEvent.change(prices[0], { target: { value: "10" } });
    fireEvent.change(prices[1], { target: { value: "10" } });
    fireEvent.change(discounts[0], { target: { value: "2" } });
    fireEvent.change(discounts[1], { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Pagamento"), { target: { value: "PIX" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar venda" }));

    await waitFor(() => expect(createSaleMutation).toHaveBeenCalledWith(expect.objectContaining({
      discount: 5,
      items: [expect.objectContaining({ discount: 2 }), expect.objectContaining({ discount: 3 })]
    })));
  });

  it("consulta e exibe produtos que não estão no primeiro lote da listagem", async () => {
    mockPage(golden);

    render(<SaleCreatePage />);
    fireEvent.change(screen.getByPlaceholderText("Digite nome, código, SKU ou código de barras"), {
      target: { value: "golden" }
    });

    await waitFor(() => expect(screen.getByText(/Golden cães adultos pequeno porte/)).toBeInTheDocument(), { timeout: 1500 });
    expect(screen.getByRole("button", { name: /Golden cães adultos pequeno porte/ })).toBeInTheDocument();
    expect(screen.getByText("R$ 22,50")).toBeInTheDocument();
    expect(screen.queryByText("Carregando produtos e saldos de estoque...")).not.toBeInTheDocument();
  });

  it("calcula o peso do granel pelo valor informado com Alt+P", async () => {
    mockPage({
      ...golden,
      id: "golden-granel",
      name: "Golden granel por kg",
      category: "Granel",
      unit: "KG",
      salePrice: 19.5
    });

    render(<SaleCreatePage />);
    fireEvent.change(screen.getByPlaceholderText("Digite nome, código, SKU ou código de barras"), {
      target: { value: "golden" }
    });
    const productButton = await screen.findByRole("button", { name: /Golden granel por kg/ }, { timeout: 1500 });
    fireEvent.click(productButton);
    fireEvent.keyDown(window, { key: "p", altKey: true });

    expect(await screen.findByRole("dialog", { name: "Venda de granel por valor" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Valor que o cliente quer pagar"), { target: { value: "13" } });
    expect(screen.getByText("0,667 kg")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar valor e peso" }));

    expect(screen.getByLabelText("Preço por kg")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue("0,667");
    expect(screen.getByText("Ajuste de arredondamento do granel")).toBeInTheDocument();
    expect(screen.getByText("- R$ 0,01")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("R$ 13,00").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("Pagamento"), { target: { value: "CASH" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar venda" }));
    await waitFor(() => expect(createSaleMutation).toHaveBeenCalledWith(expect.objectContaining({
      discount: 0.01,
      surcharge: 0,
      items: [expect.objectContaining({ quantity: 0.667, unitPrice: 19.5 })]
    })));
  });

  it("aceita o peso do granel digitado diretamente em quilogramas", async () => {
    mockPage({
      ...golden,
      id: "golden-granel-manual",
      name: "Golden granel manual",
      category: "Granel",
      unit: "KG",
      salePrice: 20
    });

    render(<SaleCreatePage />);
    fireEvent.change(screen.getByPlaceholderText("Digite nome, código, SKU ou código de barras"), { target: { value: "golden" } });
    fireEvent.click(await screen.findByRole("button", { name: /Golden granel manual/ }, { timeout: 1500 }));

    expect(screen.queryByText("A quantidade deve ser maior que zero.")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "0,300" } });
    fireEvent.change(screen.getByLabelText("Pagamento"), { target: { value: "PIX" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar venda" }));

    await waitFor(() => expect(createSaleMutation).toHaveBeenCalledWith(expect.objectContaining({
      discount: 0,
      items: [expect.objectContaining({ quantity: 0.3, unitPrice: 20 })]
    })));
  });
});
