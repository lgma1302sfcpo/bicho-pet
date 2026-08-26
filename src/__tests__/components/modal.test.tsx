import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/modal";

describe("modal responsivo", () => {
  it("exibe conteúdo, possui rolagem interna e pode ser fechado", () => {
    const onClose = vi.fn();
    render(<Modal open title="Cadastrar produto" description="Dados do produto" onClose={onClose}><p>Formulário</p></Modal>);

    const dialog = screen.getByRole("dialog", { name: "Cadastrar produto" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-1.5rem)]");
    expect(screen.getByText("Formulário")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar janela" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
