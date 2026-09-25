import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InventoryPage } from "@/components/inventory/inventory-page";
import { CustomerEngagementPage } from "@/components/customers/customer-engagement-page";
import { FinancePage } from "@/components/finance/finance-page";
import { ProductManagementPage } from "@/components/products/product-management-page";
import { SalesReportPage } from "@/components/reports/sales-report-page";
import { useProducts } from "@/hooks/catalog/use-products";
import { useCustomers, useSales } from "@/hooks/commerce/use-commerce";
import { useFinance, useInventory } from "@/hooks/use-operations";

vi.stubGlobal("React", React);

vi.mock("@/hooks/catalog/use-products", () => ({
  useProducts: vi.fn(),
  useDeleteProduct: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useCreateProduct: vi.fn(),
  useUpdateProduct: vi.fn()
}));

vi.mock("@/hooks/commerce/use-commerce", () => ({
  useSales: vi.fn(),
  useCustomers: vi.fn(),
  useDeleteCustomer: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useAssignCustomerBranch: vi.fn(() => ({ isPending: false, error: null, mutate: vi.fn() }))
}));

vi.mock("@/hooks/use-operations", () => ({
  useInventory: vi.fn(),
  useCreateInventoryMovement: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useFinance: vi.fn(),
  useCreateFinancialEntry: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useUpdateFinancialStatus: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useDeleteFinancialEntry: vi.fn(() => ({ isPending: false, mutate: vi.fn() }))
}));

const pendingQuery = {
  data: undefined,
  isPending: true,
  isError: false,
  isSuccess: false,
  refetch: vi.fn()
};

describe("carregamento das telas operacionais", () => {
  beforeEach(() => {
    vi.mocked(useProducts).mockReturnValue(pendingQuery as unknown as ReturnType<typeof useProducts>);
    vi.mocked(useInventory).mockReturnValue(pendingQuery as unknown as ReturnType<typeof useInventory>);
    vi.mocked(useSales).mockReturnValue(pendingQuery as unknown as ReturnType<typeof useSales>);
    vi.mocked(useCustomers).mockReturnValue(pendingQuery as unknown as ReturnType<typeof useCustomers>);
    vi.mocked(useFinance).mockReturnValue(pendingQuery as unknown as ReturnType<typeof useFinance>);
  });

  it("não apresenta produtos zerados antes de receber a resposta", () => {
    render(<ProductManagementPage />);
    expect(screen.getByText("Carregando produtos e saldos de estoque...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum produto encontrado.")).not.toBeInTheDocument();
  });

  it("não apresenta estoque zerado antes de receber a resposta", () => {
    render(<InventoryPage />);
    expect(screen.getByText("Carregando estoque e movimentações...")).toBeInTheDocument();
    expect(screen.queryByText("Produtos ativos")).not.toBeInTheDocument();
  });

  it("não apresenta relatório zerado antes de receber as vendas", () => {
    render(<SalesReportPage />);
    expect(useSales).toHaveBeenCalledWith({ fullReport: true });
    expect(screen.getByText("Carregando vendas e indicadores do relatório...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma venda encontrada.")).not.toBeInTheDocument();
  });

  it("não apresenta clientes zerados antes de receber a resposta", () => {
    render(<CustomerEngagementPage />);
    expect(screen.getByText("Carregando clientes e histórico de compras...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum cliente encontrado para os filtros atuais.")).not.toBeInTheDocument();
  });

  it("não apresenta financeiro zerado antes de receber os lançamentos", () => {
    render(<FinancePage />);
    expect(screen.getByText("Carregando lançamentos financeiros...")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum lançamento encontrado com os filtros atuais.")).not.toBeInTheDocument();
  });
});
