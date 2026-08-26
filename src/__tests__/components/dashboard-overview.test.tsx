import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { useDashboard } from "@/hooks/use-operations";

vi.mock("@/hooks/use-operations", () => ({
  useDashboard: vi.fn()
}));

describe("carregamento da Dashboard", () => {
  beforeEach(() => {
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useDashboard>);
  });

  it("não mostra valores zerados enquanto consulta os dados reais", () => {
    render(<DashboardOverview />);

    expect(screen.getByRole("status", { name: "Carregando indicadores da loja" })).toBeInTheDocument();
    expect(screen.getByText("Carregando os indicadores da loja...")).toBeInTheDocument();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.queryByText("Nenhuma venda registrada.")).not.toBeInTheDocument();
  });
});
