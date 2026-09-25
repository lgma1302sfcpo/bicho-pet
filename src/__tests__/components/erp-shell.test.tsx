import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ErpShell } from "@/components/layout/erp-shell";
import { AUTH_PERMISSIONS } from "@/lib/permissions";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ update: vi.fn() })
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/components/brand-logo", () => ({
  BrandLogo: () => <span aria-label="Bicho Pet" />
}));

describe("menu do ERP", () => {
  it("mantém o módulo Fiscal sem link e mostra o aviso de upgrade no cursor", () => {
    render(
      <ErpShell
        user={{
          name: "Administrador",
          currentTenantName: "Bicho Pet",
          currentBranchId: "branch-1",
          currentBranchName: "Loja principal",
          canAccessAllBranches: false,
          roleName: "Administrador",
          permissions: Object.values(AUTH_PERMISSIONS)
        }}
        branches={[{ id: "branch-1", name: "Loja principal", isMain: true }]}
      >
        <p>Conteúdo da página</p>
      </ErpShell>
    );

    const fiscalItem = screen.getByText("Fiscal").closest("[aria-disabled='true']");
    expect(fiscalItem).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fiscal" })).not.toBeInTheDocument();

    fireEvent.mouseMove(fiscalItem!, { clientX: 120, clientY: 180 });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Faça upgrade do plano para testar o módulo Fiscal.");

    fireEvent.mouseLeave(fiscalItem!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
