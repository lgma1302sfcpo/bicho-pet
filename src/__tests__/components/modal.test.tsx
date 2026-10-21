import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/modal";

describe("modal responsivo", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

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

  it("libera a rolagem após fechar um cadastro aberto dentro de outro formulário", () => {
    function Forms({ appointmentOpen, customerOpen }: { appointmentOpen: boolean; customerOpen: boolean }) {
      return <>
        <Modal open={appointmentOpen} title="Novo agendamento" onClose={() => undefined}><p>Agendamento</p></Modal>
        <Modal open={customerOpen} title="Cadastrar tutor e pet" onClose={() => undefined}><p>Cadastro do tutor</p></Modal>
      </>;
    }
    const { rerender } = render(<Forms appointmentOpen customerOpen={false}/>);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Forms appointmentOpen customerOpen/>);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    rerender(<Forms appointmentOpen customerOpen={false}/>);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Forms appointmentOpen={false} customerOpen={false}/>);
    expect(document.body.style.overflow).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mantém a rolagem bloqueada enquanto houver outra janela aberta", () => {
    function Forms({ firstOpen, secondOpen }: { firstOpen: boolean; secondOpen: boolean }) {
      return <>
        <Modal open={firstOpen} title="Primeira janela" onClose={() => undefined}><p>Primeiro conteúdo</p></Modal>
        <Modal open={secondOpen} title="Segunda janela" onClose={() => undefined}><p>Segundo conteúdo</p></Modal>
      </>;
    }
    const { rerender } = render(<Forms firstOpen secondOpen={false}/>);
    rerender(<Forms firstOpen secondOpen/>);
    rerender(<Forms firstOpen={false} secondOpen/>);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Forms firstOpen={false} secondOpen={false}/>);
    expect(document.body.style.overflow).toBe("");
  });

  it("restaura o estilo original ao desmontar as janelas durante uma troca de página", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(<><Modal open title="Primeira janela" onClose={() => undefined}><p>Primeiro conteúdo</p></Modal><Modal open title="Segunda janela" onClose={() => undefined}><p>Segundo conteúdo</p></Modal></>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("Escape fecha somente a janela que está por cima", () => {
    const onCloseAppointment = vi.fn();
    const onCloseCustomer = vi.fn();
    render(<><Modal open title="Novo agendamento" onClose={onCloseAppointment}><p>Agendamento</p></Modal><Modal open title="Cadastrar tutor e pet" onClose={onCloseCustomer}><p>Tutor</p></Modal></>);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseCustomer).toHaveBeenCalledOnce();
    expect(onCloseAppointment).not.toHaveBeenCalled();
  });

  it("usa o callback mais recente sem reiniciar o bloqueio de rolagem", () => {
    const previousClose = vi.fn();
    const currentClose = vi.fn();
    const { rerender } = render(<Modal open title="Editar produto" onClose={previousClose}><p>Produto</p></Modal>);
    rerender(<Modal open title="Editar produto" onClose={currentClose}><p>Produto atualizado</p></Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(currentClose).toHaveBeenCalledOnce();
    expect(previousClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("libera a rolagem também no modo estrito do React", () => {
    const { unmount } = render(<React.StrictMode><Modal open title="Novo agendamento" onClose={() => undefined}><p>Agendamento</p></Modal></React.StrictMode>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
