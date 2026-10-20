import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroomingSchedulePage } from "@/components/grooming/grooming-schedule-page";
import type { GroomingAgendaDTO, GroomingAppointmentDTO } from "@/dtos/grooming.dto";

vi.stubGlobal("React", React);

const mocks = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), useAgenda: vi.fn(), pending: false }));
vi.mock("@/hooks/use-grooming", () => ({
  useGroomingAgenda: mocks.useAgenda,
  useGroomingCalendar: () => ({ data: { appointments: [], blocks: [] } }),
  useCreateGroomingAppointment: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateGroomingAppointment: () => ({ mutateAsync: mocks.update, isPending: mocks.pending }),
  useSaveGroomingProfessional: () => ({}),
  useSaveGroomingService: () => ({}),
  useCreateGroomingBlock: () => ({}),
  useDeleteGroomingBlock: () => ({})
}));
vi.mock("@/components/customers/customer-create-form", () => ({ CustomerCreateForm: () => null }));

const appointment: GroomingAppointmentDTO = {
  id: "appointment-1", startAt: "2026-10-20T12:00:00.000Z", endAt: "2026-10-20T13:30:00.000Z", status: "CONFIRMED",
  price: 90, commissionAmount: 0, isPackage: false, purchasedProducts: false, photoTaken: false, reminderSentAt: null,
  customer: { id: "customer-1", name: "Mônica" },
  pet: { id: "pet-1", name: "Pitchula", species: "Cachorro" },
  service: { id: "service-1", name: "Banho e tosa", durationMinutes: 60, defaultPrice: 90 },
  professional: { id: "professional-1", name: "Juliana", commissionPercent: 0 }
};

function agendaWith(item = appointment): GroomingAgendaDTO {
  return { date: "2026-10-20", appointments: [item], reminders: [item], professionals: [item.professional], services: [item.service], customers: [], blocks: [] };
}

function openEditor(index = 0) {
  fireEvent.click(screen.getAllByRole("button", { name: "Editar horário" })[index]);
  return screen.getByRole("dialog", { name: "Editar horário" });
}

describe("correção do horário na agenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending = false;
    mocks.update.mockResolvedValue({ updated: true });
    mocks.useAgenda.mockReturnValue({ data: agendaWith(), isPending: false, isError: false });
  });

  it.each([0, 1])("abre a edição pelo lembrete ou pelo atendimento: %s", (index) => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor(index);

    expect(within(dialog).getByLabelText("Data do atendimento")).toHaveValue("2026-10-20");
    expect(within(dialog).getByLabelText("Horário inicial")).toHaveValue("09:00");
    expect(within(dialog).getByText("09:00 até 10:30")).toBeInTheDocument();
    expect(within(dialog).getByText("Duração: 1h 30min.")).toBeInTheDocument();
  });

  it("salva o novo horário no mesmo agendamento com o fuso de São Paulo e abre o novo dia", async () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Data do atendimento"), { target: { value: "2026-10-21" } });
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "14:15" } });
    expect(within(dialog).getByText("14:15 até 15:45")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar horário" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.update).toHaveBeenCalledWith({ id: appointment.id, startAt: "2026-10-21T17:15:00.000Z" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.useAgenda).toHaveBeenLastCalledWith("2026-10-21");
    expect(screen.getByRole("status")).toHaveTextContent("Horário do agendamento atualizado.");
  });

  it("mantém o formulário e apresenta a mensagem quando o novo horário está lotado", async () => {
    mocks.update.mockRejectedValue(new Error("Este profissional já possui dois pets nesse período. Escolha outro horário."));
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "11:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar horário" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Este profissional já possui dois pets nesse período.");
    expect(within(dialog).getByLabelText("Horário inicial")).toHaveValue("11:00");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("avisa para reenviar um lembrete que já havia sido enviado", () => {
    mocks.useAgenda.mockReturnValue({ data: agendaWith({ ...appointment, reminderSentAt: "2026-10-19T12:00:00.000Z" }), isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);

    expect(within(openEditor()).getByText("Após alterar o horário, envie um novo lembrete para avisar o tutor.")).toBeInTheDocument();
  });

  it("cancelar fecha a edição sem salvar e reabrir recupera o horário original", () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "15:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(within(openEditor()).getByLabelText("Horário inicial")).toHaveValue("09:00");
  });

  it("bloqueia duplo envio e o fechamento enquanto salva", () => {
    mocks.pending = true;
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();

    expect(within(dialog).getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(within(dialog).getByLabelText("Horário inicial")).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar janela" }));
    expect(dialog).toBeInTheDocument();
  });

  it("não mostra a edição para quem só pode consultar", () => {
    render(<GroomingSchedulePage canManage={false} canManageCustomers={false}/>);
    expect(screen.queryByRole("button", { name: "Editar horário" })).not.toBeInTheDocument();
  });

  it("não mostra a edição em atendimentos cancelados", () => {
    mocks.useAgenda.mockReturnValue({ data: { ...agendaWith({ ...appointment, status: "CANCELLED" }), reminders: [] }, isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    expect(screen.queryByRole("button", { name: "Editar horário" })).not.toBeInTheDocument();
  });
});
