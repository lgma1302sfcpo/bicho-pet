"use client";

import { Ban, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, MessageCircle, PackageCheck, Plus, Scissors, Settings2, ShoppingBag, UserPlus, UserRound, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import type { GroomingAppointmentDTO, GroomingScheduleBlockDTO } from "@/dtos/grooming.dto";
import { useCreateGroomingAppointment, useCreateGroomingBlock, useDeleteGroomingBlock, useGroomingAgenda, useGroomingCalendar, useSaveGroomingProfessional, useSaveGroomingService, useUpdateGroomingAppointment } from "@/hooks/use-grooming";
import { GROOMING_SIMULTANEOUS_CAPACITY, nextAvailableStart } from "@/lib/grooming-schedule";
import { buildGroomingWhatsAppReminder } from "@/lib/grooming-reminder";
import { parseBrazilianNumber } from "@/lib/utils";

const statusLabels: Record<GroomingAppointmentDTO["status"], string> = {
  SCHEDULED: "Agendado", CONFIRMED: "Confirmado", IN_SERVICE: "Em atendimento", COMPLETED: "Concluído", CANCELLED: "Cancelado", NO_SHOW: "Não compareceu"
};

const statusClasses: Record<GroomingAppointmentDTO["status"], string> = {
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  IN_SERVICE: "border-amber-200 bg-amber-50 text-amber-900",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
  NO_SHOW: "border-orange-200 bg-orange-50 text-orange-800"
};

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function timeLabel(value: string | Date) {
  return new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function dateLabel(value: string) {
  const text = new Date(`${value}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function isoAt(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

function dateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function monthCells(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= total ? `${month}-${String(day).padStart(2, "0")}` : null;
  });
}

function suggestion(date: string, professionalId: string, duration: number, appointments: GroomingAppointmentDTO[], blocks: GroomingScheduleBlockDTO[]) {
  const periods = [
    ...appointments.filter((item) => item.professional.id === professionalId && item.status !== "CANCELLED"),
    ...blocks
      .filter((item) => !item.professionalId || item.professionalId === professionalId)
      .map((item) => ({ ...item, capacityUsed: GROOMING_SIMULTANEOUS_CAPACITY }))
  ];
  return timeLabel(nextAvailableStart(new Date(`${date}T09:00:00-03:00`), duration, periods));
}

type AppointmentForm = { customerId: string; petId: string; serviceId: string; professionalId: string; time: string; price: string; isPackage: boolean; notes: string };
const emptyAppointment: AppointmentForm = { customerId: "", petId: "", serviceId: "", professionalId: "", time: "09:00", price: "", isPackage: false, notes: "" };

export function GroomingSchedulePage({ canManage, canManageCustomers }: { canManage: boolean; canManageCustomers: boolean }) {
  const [date, setDate] = useState(localDate());
  const agenda = useGroomingAgenda(date);
  const calendar = useGroomingCalendar(date.slice(0, 7));
  const createAppointment = useCreateGroomingAppointment();
  const updateAppointment = useUpdateGroomingAppointment();
  const saveProfessional = useSaveGroomingProfessional();
  const saveService = useSaveGroomingService();
  const createBlock = useCreateGroomingBlock();
  const deleteBlock = useDeleteGroomingBlock();
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [form, setForm] = useState<AppointmentForm>(emptyAppointment);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [professionalForm, setProfessionalForm] = useState({ id: "", name: "", commissionPercent: "" });
  const [serviceForm, setServiceForm] = useState({ id: "", name: "", durationMinutes: "60", defaultPrice: "" });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState({ professionalId: "", startTime: "12:00", endTime: "13:00", reason: "Almoço" });
  const [blockError, setBlockError] = useState<string | null>(null);

  const data = agenda.data;
  const appointments = data?.appointments ?? [];
  const professionals = data?.professionals ?? [];
  const services = data?.services ?? [];
  const customers = data?.customers ?? [];
  const blocks = data?.blocks ?? [];
  const reminders = data?.reminders ?? [];
  const selectedCustomer = customers.find((item) => item.id === form.customerId);
  const selectedService = services.find((item) => item.id === form.serviceId);
  const previewEnd = selectedService && form.time ? timeLabel(new Date(new Date(isoAt(date, form.time)).getTime() + selectedService.durationMinutes * 60_000)) : "--:--";
  const dayRevenue = appointments.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + item.price, 0);
  const dayCommission = appointments.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + item.commissionAmount, 0);

  const appointmentsByProfessional = new Map(professionals.map((professional) => [professional.id, appointments.filter((item) => item.professional.id === professional.id)]));

  function openAppointment(preselectedProfessionalId?: string, preselectedTime?: string) {
    const professional = professionals.find((item) => item.id === preselectedProfessionalId) ?? professionals[0];
    const service = services[0];
    const time = preselectedTime ?? (professional && service ? suggestion(date, professional.id, service.durationMinutes, appointments, blocks) : "09:00");
    setForm({ ...emptyAppointment, professionalId: professional?.id ?? "", serviceId: service?.id ?? "", price: service ? String(service.defaultPrice) : "", time });
    setFormError(null);
    setAppointmentOpen(true);
  }

  function chooseProfessional(professionalId: string) {
    setForm((current) => ({ ...current, professionalId, time: selectedService ? suggestion(date, professionalId, selectedService.durationMinutes, appointments, blocks) : current.time }));
  }

  function chooseService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setForm((current) => ({ ...current, serviceId, price: service ? String(service.defaultPrice) : "", time: service && current.professionalId ? suggestion(date, current.professionalId, service.durationMinutes, appointments, blocks) : current.time }));
  }

  async function submitAppointment() {
    setFormError(null);
    if (!form.customerId || !form.petId || !form.serviceId || !form.professionalId || !form.time) {
      setFormError("Selecione tutor, pet, serviço, profissional e horário.");
      return;
    }
    try {
      await createAppointment.mutateAsync({ ...form, startAt: isoAt(date, form.time), price: Number(parseBrazilianNumber(form.price) ?? 0) });
      setAppointmentOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível agendar.");
    }
  }

  async function changeAppointment(id: string, payload: { status?: string; purchasedProducts?: boolean; photoTaken?: boolean; reminderSent?: boolean }) {
    setActionError(null);
    try { await updateAppointment.mutateAsync({ id, ...payload }); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Não foi possível atualizar o agendamento."); }
  }

  function sendReminder(appointment: GroomingAppointmentDTO) {
    const link = buildGroomingWhatsAppReminder({ customerName: appointment.customer.name, petName: appointment.pet.name, serviceName: appointment.service.name, professionalName: appointment.professional.name, startAt: appointment.startAt, phone: appointment.customer.whatsapp || appointment.customer.phone });
    if (!link) {
      setActionError(`O tutor ${appointment.customer.name} não possui WhatsApp ou telefone cadastrado.`);
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
    void changeAppointment(appointment.id, { reminderSent: true });
  }

  async function submitBlock() {
    setBlockError(null);
    try {
      await createBlock.mutateAsync({ professionalId: blockForm.professionalId || undefined, startAt: isoAt(date, blockForm.startTime), endAt: isoAt(date, blockForm.endTime), reason: blockForm.reason });
      setBlockOpen(false);
    } catch (error) { setBlockError(error instanceof Error ? error.message : "Não foi possível bloquear o horário."); }
  }

  async function customerCreated(customer: CustomerListItemDTO) {
    setCustomerOpen(false);
    await agenda.refetch();
    setForm((current) => ({ ...current, customerId: customer.id, petId: customer.pets[0]?.id ?? "" }));
  }

  async function submitProfessional() {
    setSettingsError(null);
    try {
      await saveProfessional.mutateAsync({ id: professionalForm.id || undefined, name: professionalForm.name, commissionPercent: professionalForm.commissionPercent || 0 });
      setProfessionalForm({ id: "", name: "", commissionPercent: "" });
    } catch (error) { setSettingsError(error instanceof Error ? error.message : "Não foi possível salvar o profissional."); }
  }

  async function submitService() {
    setSettingsError(null);
    try {
      await saveService.mutateAsync({ id: serviceForm.id || undefined, name: serviceForm.name, durationMinutes: serviceForm.durationMinutes, defaultPrice: serviceForm.defaultPrice || 0 });
      setServiceForm({ id: "", name: "", durationMinutes: "60", defaultPrice: "" });
    } catch (error) { setSettingsError(error instanceof Error ? error.message : "Não foi possível salvar o serviço."); }
  }

  return (
    <div className="erp-page space-y-5">
      <div className="erp-page-header flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-semibold text-ink">Agenda de Banho e Tosa</h1><p className="text-sm text-subdued">Horários calculados automaticamente pela duração de cada serviço.</p></div>
        <div className="flex flex-wrap gap-2">
          {canManage ? <Button variant="secondary" onClick={() => setSettingsOpen(true)}><Settings2 size={17}/> Serviços e profissionais</Button> : null}
          {canManage ? <Button variant="secondary" onClick={() => { setBlockError(null); setBlockOpen(true); }}><Ban size={17}/> Bloquear horário</Button> : null}
          {canManage ? <Button onClick={() => openAppointment()} disabled={!professionals.length || !services.length}><Plus size={18}/> Novo agendamento</Button> : null}
        </div>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><Button variant="secondary" className="px-2" aria-label="Dia anterior" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft size={19}/></Button><Input type="date" value={date} onChange={(event) => setDate(event.target.value)}/><Button variant="secondary" className="px-2" aria-label="Próximo dia" onClick={() => setDate(shiftDate(date, 1))}><ChevronRight size={19}/></Button></div>
          <div><p className="font-semibold">{dateLabel(date)}</p><button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setDate(localDate())}>Voltar para hoje</button></div>
          <div className="flex gap-5 text-sm"><div><p className="text-xs text-subdued">Agendamentos</p><strong>{appointments.filter((item) => item.status !== "CANCELLED").length}</strong></div><div><p className="text-xs text-subdued">Valor previsto</p><strong>{money(dayRevenue)}</strong></div><div><p className="text-xs text-subdued">Comissões</p><strong>{money(dayCommission)}</strong></div></div>
        </div>
      </Card>

      {agenda.isPending ? <Card className="p-8 text-center text-sm text-subdued">Carregando a agenda...</Card> : null}
      {agenda.isError ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-danger">{agenda.error.message}</Card> : null}
      {actionError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{actionError}</div> : null}

      {reminders.length ? <Card className="border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-3 flex items-center gap-2"><MessageCircle size={20} className="text-emerald-700"/><div><h2 className="font-semibold text-emerald-900">Lembretes pendentes</h2><p className="text-xs text-emerald-800">Atendimentos de hoje e amanhã que ainda não receberam lembrete.</p></div></div>
        <div className="grid gap-2 lg:grid-cols-2">{reminders.map((appointment) => <div key={appointment.id} className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm">{appointment.pet.name} · {appointment.customer.name}</strong><p className="text-xs text-subdued">{new Date(appointment.startAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às {timeLabel(appointment.startAt)} · {appointment.service.name}</p></div><Button className="h-9 shrink-0" onClick={() => sendReminder(appointment)}><MessageCircle size={16}/> Enviar WhatsApp</Button></div>)}</div>
      </Card> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Calendário</h2><p className="text-xs text-subdued">Clique em um dia para abrir a agenda.</p></div><CalendarDays size={20} className="text-brand-700"/></div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-subdued">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">{monthCells(date.slice(0, 7)).map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="h-12"/>;
            const appointmentsCount = calendar.data?.appointments.filter((item) => item.status !== "CANCELLED" && dateKey(item.startAt) === day).length ?? 0;
            const blocked = calendar.data?.blocks.some((item) => dateKey(item.startAt) === day) ?? false;
            return <button key={day} className={`relative h-12 rounded-md border text-sm transition hover:border-brand-400 hover:bg-brand-50 ${day === date ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-border"}`} onClick={() => setDate(day)}><span>{Number(day.slice(-2))}</span><span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">{appointmentsCount ? <i className="h-1.5 w-1.5 rounded-full bg-brand-600" title={`${appointmentsCount} agendamentos`}/> : null}{blocked ? <i className="h-1.5 w-1.5 rounded-full bg-red-500" title="Possui bloqueio"/> : null}</span></button>;
          })}</div>
          <div className="mt-3 flex gap-4 text-[11px] text-subdued"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand-600"/> Agendamento</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500"/> Bloqueio</span></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Horários disponíveis e ocupados</h2><p className="text-xs text-subdued">Cada profissional pode atender até 2 pets ao mesmo tempo. Clique em um horário com vaga para agendar.</p></div>
          <div className="max-h-[430px] overflow-auto"><table className="w-full min-w-[620px] text-xs"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="w-20 px-3 py-2 text-left">Horário</th>{professionals.map((professional) => <th key={professional.id} className="px-3 py-2 text-left">{professional.name}</th>)}</tr></thead><tbody className="divide-y divide-border">{Array.from({ length: 24 }, (_, index) => 8 * 60 + index * 30).map((minutes) => {
            const hour = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
            const slotStart = new Date(isoAt(date, hour));
            const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
            return <tr key={hour}><th className="px-3 py-2 text-left font-semibold">{hour}</th>{professionals.map((professional) => {
              const slotAppointments = appointments.filter((item) => item.professional.id === professional.id && item.status !== "CANCELLED" && new Date(item.startAt) < slotEnd && new Date(item.endAt) > slotStart);
              const block = blocks.find((item) => (!item.professionalId || item.professionalId === professional.id) && new Date(item.startAt) < slotEnd && new Date(item.endAt) > slotStart);
              if (block) return <td key={professional.id} className="bg-red-50 px-3 py-2 text-red-700" title={block.reason}>Bloqueado · {block.reason}</td>;
              if (slotAppointments.length >= GROOMING_SIMULTANEOUS_CAPACITY) return <td key={professional.id} className="bg-sky-100 px-3 py-2 font-medium text-sky-900" title={slotAppointments.map((item) => `${item.pet.name} · ${item.service.name}`).join("\n")}>Lotado · 2 pets</td>;
              if (slotAppointments.length) return <td key={professional.id} className="bg-sky-50 px-2 py-1" title={`${slotAppointments[0].pet.name} · ${slotAppointments[0].service.name}`}><button className="w-full rounded px-2 py-1 text-left font-medium text-sky-800 hover:bg-sky-100" onClick={() => canManage && openAppointment(professional.id, hour)}>{slotAppointments[0].pet.name} · 1 vaga livre</button></td>;
              return <td key={professional.id} className="px-2 py-1"><button className="w-full rounded px-2 py-1 text-left text-emerald-700 hover:bg-emerald-50" onClick={() => canManage && openAppointment(professional.id, hour)}>Livre</button></td>;
            })}</tr>;
          })}</tbody></table></div>
        </Card>
      </div>

      {blocks.length ? <Card className="p-4"><h2 className="font-semibold">Bloqueios deste dia</h2><div className="mt-3 flex flex-wrap gap-2">{blocks.map((block) => <div key={block.id} className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"><Ban size={14}/><span><strong>{timeLabel(block.startAt)}–{timeLabel(block.endAt)}</strong> · {block.professionalName ?? "Todos os profissionais"} · {block.reason}</span>{canManage ? <button className="rounded p-1 hover:bg-red-100" aria-label="Excluir bloqueio" onClick={() => void deleteBlock.mutateAsync(block.id)}><X size={14}/></button> : null}</div>)}</div></Card> : null}

      {!agenda.isPending && data && !professionals.length ? <Card className="p-8 text-center"><Scissors className="mx-auto text-brand-600" size={34}/><h2 className="mt-3 font-semibold">Cadastre os profissionais</h2><p className="mt-1 text-sm text-subdued">Adicione as pessoas que atendem banho e tosa para montar a agenda.</p>{canManage ? <Button className="mt-4" onClick={() => setSettingsOpen(true)}><Plus size={17}/> Configurar agenda</Button> : null}</Card> : null}

      {professionals.length ? <div className="grid items-start gap-4 xl:grid-cols-2">
        {professionals.map((professional) => {
          const professionalAppointments = appointmentsByProfessional.get(professional.id) ?? [];
          const commission = professionalAppointments.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + item.commissionAmount, 0);
          return <Card key={professional.id} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-brand-50 px-4 py-3"><div className="flex items-center gap-2"><UserRound size={19} className="text-brand-700"/><div><h2 className="font-semibold">{professional.name}</h2><p className="text-xs text-subdued">Comissão do dia: {money(commission)}</p></div></div><Badge>{professionalAppointments.filter((item) => item.status !== "CANCELLED").length} horários</Badge></div>
            <div className="space-y-3 p-3">
              {professionalAppointments.map((appointment) => <div key={appointment.id} className={`rounded-lg border p-3 ${statusClasses[appointment.status]}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-md bg-white/80 px-2 py-1 text-center shadow-sm"><strong className="block text-base">{timeLabel(appointment.startAt)}</strong><span className="text-[11px]">até {timeLabel(appointment.endAt)}</span></div><div><strong className="block">{appointment.pet.name}</strong><span className="text-xs">Tutor: {appointment.customer.name}</span><p className="mt-1 text-sm font-medium">{appointment.service.name} · {durationLabel(appointment.service.durationMinutes)}</p></div></div><div className="text-left sm:text-right"><Badge>{statusLabels[appointment.status]}</Badge><strong className="mt-1 block">{money(appointment.price)}</strong><span className="text-xs">Comissão {money(appointment.commissionAmount)}</span></div></div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">{appointment.isPackage ? <Badge>Pacote</Badge> : null}{appointment.notes ? <span className="rounded bg-white/70 px-2 py-1">Obs.: {appointment.notes}</span> : null}</div>
                {canManage && appointment.status !== "CANCELLED" ? <div className="mt-3 flex flex-wrap gap-2 border-t border-current/10 pt-2">
                  {appointment.status === "SCHEDULED" ? <Button className="h-8 px-2 text-xs" variant="secondary" onClick={() => void changeAppointment(appointment.id, { status: "CONFIRMED" })}><Check size={14}/> Confirmar</Button> : null}
                  {appointment.status === "CONFIRMED" ? <Button className="h-8 px-2 text-xs" variant="secondary" onClick={() => void changeAppointment(appointment.id, { status: "IN_SERVICE" })}><Clock3 size={14}/> Iniciar</Button> : null}
                  {appointment.status === "IN_SERVICE" ? <Button className="h-8 px-2 text-xs" variant="secondary" onClick={() => void changeAppointment(appointment.id, { status: "COMPLETED" })}><PackageCheck size={14}/> Concluir</Button> : null}
                  {!appointment.reminderSentAt && (["SCHEDULED", "CONFIRMED"] as string[]).includes(appointment.status) ? <Button className="h-8 px-2 text-xs" variant="secondary" onClick={() => sendReminder(appointment)}><MessageCircle size={14}/> Lembrete</Button> : null}
                  <Button className="h-8 px-2 text-xs" variant={appointment.purchasedProducts ? "primary" : "secondary"} onClick={() => void changeAppointment(appointment.id, { purchasedProducts: !appointment.purchasedProducts })}><ShoppingBag size={14}/> Comprou</Button>
                  <Button className="h-8 px-2 text-xs" variant={appointment.photoTaken ? "primary" : "secondary"} onClick={() => void changeAppointment(appointment.id, { photoTaken: !appointment.photoTaken })}><Camera size={14}/> Foto</Button>
                  {!(["COMPLETED", "NO_SHOW"] as string[]).includes(appointment.status) ? <Button className="h-8 px-2 text-xs text-danger" variant="ghost" onClick={() => void changeAppointment(appointment.id, { status: "CANCELLED" })}><X size={14}/> Cancelar</Button> : null}
                </div> : null}
              </div>)}
              {!professionalAppointments.length ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-subdued">Nenhum horário agendado.</div> : null}
            </div>
          </Card>;
        })}
      </div> : null}

      <Modal open={appointmentOpen} title="Novo agendamento" description="O horário final será calculado conforme a duração do serviço." onClose={() => setAppointmentOpen(false)} className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tutor" value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value, petId: "" }))}><option value="">Selecione</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select>
          <Select label="Pet" value={form.petId} disabled={!selectedCustomer} onChange={(event) => setForm((current) => ({ ...current, petId: event.target.value }))}><option value="">Selecione</option>{selectedCustomer?.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}{pet.breed ? ` · ${pet.breed}` : ""}</option>)}</Select>
          {canManageCustomers ? <div className="sm:col-span-2"><Button className="w-full" variant="secondary" onClick={() => setCustomerOpen(true)}><UserPlus size={16}/> Cadastrar tutor e pet sem sair da agenda</Button></div> : null}
          <Select label="Profissional" value={form.professionalId} onChange={(event) => chooseProfessional(event.target.value)}><option value="">Selecione</option>{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Select label="Serviço" value={form.serviceId} onChange={(event) => chooseService(event.target.value)}><option value="">Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name} · {durationLabel(item.durationMinutes)}</option>)}</Select>
          <Input label="Horário inicial" type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}/>
          <Input label="Valor" mask="currency" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}/>
        </div>
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4"><div className="flex items-center gap-2 text-brand-800"><CalendarDays size={18}/><strong>{form.time || "--:--"} até {previewEnd}</strong></div><p className="mt-1 text-xs text-brand-700">{selectedService ? `${selectedService.name}: ${durationLabel(selectedService.durationMinutes)}. São permitidos até 2 pets simultâneos para o mesmo profissional.` : "Selecione o serviço para calcular o término."}</p></div>
        <label className="mt-4 flex items-center gap-2 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={form.isPackage} onChange={(event) => setForm((current) => ({ ...current, isPackage: event.target.checked }))}/> Atendimento faz parte de um pacote</label>
        <div className="mt-4"><Input label="Observação" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}/></div>
        {formError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{formError}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setAppointmentOpen(false)}>Cancelar</Button><Button onClick={() => void submitAppointment()} disabled={createAppointment.isPending}>{createAppointment.isPending ? "Agendando..." : "Agendar"}</Button></div>
      </Modal>

      <Modal open={blockOpen} title="Bloquear horário" description={`Impeça novos agendamentos em ${dateLabel(date)}.`} onClose={() => setBlockOpen(false)} className="max-w-lg">
        <div className="space-y-4">
          <Select label="Profissional" value={blockForm.professionalId} onChange={(event) => setBlockForm((current) => ({ ...current, professionalId: event.target.value }))}><option value="">Todos os profissionais</option>{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <div className="grid grid-cols-2 gap-3"><Input label="Início" type="time" value={blockForm.startTime} onChange={(event) => setBlockForm((current) => ({ ...current, startTime: event.target.value }))}/><Input label="Fim" type="time" value={blockForm.endTime} onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}/></div>
          <Input label="Motivo" placeholder="Ex.: Almoço, folga ou manutenção" value={blockForm.reason} onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))}/>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" className="h-8 text-xs" onClick={() => setBlockForm((current) => ({ ...current, startTime: "00:00", endTime: "23:59", reason: current.reason || "Folga" }))}>Bloquear o dia inteiro</Button><Button variant="secondary" className="h-8 text-xs" onClick={() => setBlockForm((current) => ({ ...current, startTime: "12:00", endTime: "13:00", reason: "Almoço" }))}>Horário de almoço</Button></div>
          {blockError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{blockError}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setBlockOpen(false)}>Cancelar</Button><Button onClick={() => void submitBlock()} disabled={createBlock.isPending || !blockForm.reason.trim()}>{createBlock.isPending ? "Bloqueando..." : "Bloquear"}</Button></div>
        </div>
      </Modal>

      <Modal open={customerOpen} title="Cadastrar tutor e pet" description="Depois de salvar, o novo cadastro será selecionado no agendamento." onClose={() => setCustomerOpen(false)} className="max-w-3xl">
        <CustomerCreateForm onCancel={() => setCustomerOpen(false)} onSuccess={(customer) => void customerCreated(customer)}/>
      </Modal>

      <Modal open={settingsOpen} title="Serviços e profissionais" description="Defina duração, preço e comissão usados automaticamente na agenda." onClose={() => setSettingsOpen(false)} className="max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <div><h3 className="font-semibold">Profissionais</h3><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]"><Input label="Nome" value={professionalForm.name} onChange={(event) => setProfessionalForm((current) => ({ ...current, name: event.target.value }))}/><Input label="Comissão (%)" mask="decimal" value={professionalForm.commissionPercent} onChange={(event) => setProfessionalForm((current) => ({ ...current, commissionPercent: event.target.value }))}/></div><Button className="mt-3 w-full" onClick={() => void submitProfessional()} disabled={!professionalForm.name.trim() || saveProfessional.isPending}>{professionalForm.id ? "Salvar profissional" : "Adicionar profissional"}</Button><div className="mt-4 space-y-2">{professionals.map((item) => <button key={item.id} className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left text-sm hover:bg-muted" onClick={() => setProfessionalForm({ id: item.id, name: item.name, commissionPercent: String(item.commissionPercent) })}><strong>{item.name}</strong><span>{item.commissionPercent}%</span></button>)}</div></div>
          <div><h3 className="font-semibold">Serviços</h3><div className="mt-3 space-y-3"><Input label="Nome do serviço" value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}/><div className="grid grid-cols-2 gap-3"><Input label="Duração (min)" mask="integer" value={serviceForm.durationMinutes} onChange={(event) => setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))}/><Input label="Preço padrão" mask="currency" value={serviceForm.defaultPrice} onChange={(event) => setServiceForm((current) => ({ ...current, defaultPrice: event.target.value }))}/></div></div><Button className="mt-3 w-full" onClick={() => void submitService()} disabled={!serviceForm.name.trim() || saveService.isPending}>{serviceForm.id ? "Salvar serviço" : "Adicionar serviço"}</Button><div className="mt-4 space-y-2">{services.map((item) => <button key={item.id} className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left text-sm hover:bg-muted" onClick={() => setServiceForm({ id: item.id, name: item.name, durationMinutes: String(item.durationMinutes), defaultPrice: String(item.defaultPrice) })}><span><strong className="block">{item.name}</strong><span className="text-xs text-subdued">{money(item.defaultPrice)}</span></span><span>{durationLabel(item.durationMinutes)}</span></button>)}</div></div>
        </div>
        {settingsError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{settingsError}</p> : null}
      </Modal>
    </div>
  );
}
