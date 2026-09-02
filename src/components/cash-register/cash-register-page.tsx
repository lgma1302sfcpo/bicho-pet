"use client";

import { ArrowDownToLine, ArrowUpFromLine, Banknote, CheckCircle2, Clock3, CreditCard, LockKeyhole, QrCode, RefreshCw, RotateCcw, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCashMovement, useCashRegister, useCloseCashRegister, useOpenCashRegister, useReopenCashRegister } from "@/hooks/use-cash-register";
import type { CashMovementType, CashRegisterReport } from "@/types/cash-register";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

const movementLabels: Record<CashMovementType, string> = {
  CASH_SALE: "Venda em dinheiro",
  SUPPLY: "Suprimento",
  WITHDRAWAL: "Sangria"
};

const paymentLabels = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  PIX: "Pix",
  STORE_CREDIT: "Fiado / crediário",
  VOUCHER: "Vale",
  MIXED: "Pagamento misto"
} as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "positive" | "negative" }) {
  return <div className="rounded-xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-subdued">{label}</p><p className={`mt-2 text-xl font-bold ${tone === "positive" ? "text-success" : tone === "negative" ? "text-danger" : "text-ink"}`}>{money.format(value)}</p></div>;
}

function PaymentBreakdown({ report }: { report: CashRegisterReport }) {
  const icons = { CASH: Banknote, CREDIT_CARD: CreditCard, DEBIT_CARD: CreditCard, PIX: QrCode, STORE_CREDIT: Wallet, VOUCHER: Wallet, MIXED: Wallet };
  return <div className="border-t border-border p-4"><h4 className="mb-3 font-semibold">Vendas por meio de pagamento</h4><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(paymentLabels).map(([method, label]) => { const Icon = icons[method as keyof typeof icons]; const value = report.paymentBreakdown[method as keyof typeof report.paymentBreakdown]; return <div key={method} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3"><div className="flex min-w-0 items-center gap-2"><Icon size={18} className="shrink-0 text-brand-700"/><span className="truncate text-sm">{label}</span></div><strong className="whitespace-nowrap text-sm">{money.format(value)}</strong></div>; })}</div></div>;
}

function CashReport({ report, open = false, onReopen }: { report: CashRegisterReport; open?: boolean; onReopen?: (report: CashRegisterReport) => void }) {
  const differenceTone = (report.difference ?? 0) < 0 ? "text-danger" : (report.difference ?? 0) > 0 ? "text-amber-700" : "text-success";
  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="flex items-center gap-2"><h3 className="font-semibold">Caixa de {dateTime.format(new Date(report.openedAt))}</h3><Badge className={open ? "border-emerald-200 bg-emerald-50 text-success" : ""}>{open ? "Aberto" : "Fechado"}</Badge></div><p className="mt-1 text-sm text-subdued">Aberto por {report.openedByName ?? "usuário não identificado"}{report.closedAt ? ` • Fechado em ${dateTime.format(new Date(report.closedAt))}` : ""}{report.reopenedAt ? ` • Última reabertura em ${dateTime.format(new Date(report.reopenedAt))} por ${report.reopenedByName ?? "usuário não identificado"}` : ""}</p></div>
      <div className="flex items-center gap-3"><div className="text-left sm:text-right"><p className="text-xs text-subdued">Saldo esperado em dinheiro</p><p className="text-lg font-bold">{money.format(report.expectedAmount)}</p></div>{onReopen ? <Button variant="secondary" onClick={() => onReopen(report)}><RotateCcw size={16}/>Reabrir</Button> : null}</div>
    </div>
    <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
      {[["Fundo inicial", report.openingAmount], ["Vendas em dinheiro", report.cashSales], ["Suprimentos", report.supplies], ["Sangrias", -report.withdrawals], ["Valor contado", report.actualAmount]].map(([label, value]) => <div key={String(label)} className="bg-white px-4 py-3"><p className="text-xs text-subdued">{label}</p><p className="mt-1 font-semibold">{value == null ? "—" : money.format(Number(value))}</p></div>)}
    </div>
    <PaymentBreakdown report={report}/>
    {!open ? <div className="flex flex-col gap-2 border-t border-border bg-muted/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Fechado por {report.closedByName ?? "usuário não identificado"} • {report.salesCount} venda(s){report.reopenCount ? ` • Reaberto ${report.reopenCount} vez(es)` : ""}</span><strong className={differenceTone}>Diferença em dinheiro: {money.format(report.difference ?? 0)}</strong></div> : null}
    {report.movements.length ? <details className="border-t border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-700">Ver {report.movements.length} movimentação(ões)</summary><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-2">Horário</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2">Responsável</th><th className="px-4 py-2 text-right">Valor</th></tr></thead><tbody className="divide-y divide-border">{report.movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3">{dateTime.format(new Date(movement.createdAt))}</td><td className="px-4 py-3">{movementLabels[movement.type]}</td><td className="px-4 py-3">{movement.description}</td><td className="px-4 py-3 text-subdued">{movement.userName ?? "—"}</td><td className={`px-4 py-3 text-right font-semibold ${movement.type === "WITHDRAWAL" ? "text-danger" : "text-success"}`}>{movement.type === "WITHDRAWAL" ? "− " : "+ "}{money.format(movement.amount)}</td></tr>)}</tbody></table></div></details> : null}
  </Card>;
}

export function CashRegisterPage({ canManage }: { canManage: boolean }) {
  const query = useCashRegister();
  const openMutation = useOpenCashRegister();
  const movementMutation = useCashMovement();
  const closeMutation = useCloseCashRegister();
  const reopenMutation = useReopenCashRegister();
  const [view, setView] = useState<"current" | "history">("current");
  const [modal, setModal] = useState<"open" | "SUPPLY" | "WITHDRAWAL" | "close" | "reopen" | null>(null);
  const [selectedReport, setSelectedReport] = useState<CashRegisterReport | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const current = query.data?.current;

  function showModal(next: typeof modal) { setAmount(next === "close" && current ? String(current.expectedAmount.toFixed(2)) : ""); setDescription(""); setFormError(null); setModal(next); }
  function showReopen(report: CashRegisterReport) { setSelectedReport(report); setFormError(null); setModal("reopen"); }
  function closeModal() { if (!openMutation.isPending && !movementMutation.isPending && !closeMutation.isPending && !reopenMutation.isPending) setModal(null); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setFormError(null);
      if (modal === "reopen") {
        if (!selectedReport) return;
        await reopenMutation.mutateAsync({ cashRegisterId: selectedReport.id });
        setView("current");
        setModal(null);
        return;
      }
      const parsedAmount = Number(amount.replace(",", "."));
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return setFormError("Informe um valor válido.");
      if (modal === "open") await openMutation.mutateAsync({ openingAmount: parsedAmount, notes: description });
      if (modal === "SUPPLY" || modal === "WITHDRAWAL") await movementMutation.mutateAsync({ type: modal, amount: parsedAmount, description });
      if (modal === "close") await closeMutation.mutateAsync({ actualAmount: parsedAmount, notes: description });
      setModal(null);
    } catch (error) { setFormError(errorMessage(error)); }
  }

  if (query.isLoading) return <div className="grid min-h-72 place-items-center text-subdued"><RefreshCw className="animate-spin" />Carregando caixa...</div>;
  if (query.isError) return <Card className="p-6 text-center"><p className="text-danger">{errorMessage(query.error)}</p><Button className="mt-4" variant="secondary" onClick={() => void query.refetch()}><RefreshCw size={17}/>Tentar novamente</Button></Card>;

  return <div className="erp-page space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><Banknote className="text-brand-700"/>Caixa</h1><p className="mt-1 text-sm text-subdued">Controle o dinheiro físico da loja por abertura e fechamento de turno.</p></div><Button variant="secondary" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={17} className={query.isFetching ? "animate-spin" : ""}/>Atualizar</Button></header>

    <div className="flex gap-1 border-b border-border"><button type="button" className={`border-b-2 px-4 py-3 text-sm font-semibold ${view === "current" ? "border-brand-600 text-brand-700" : "border-transparent text-subdued"}`} onClick={() => setView("current")}>Caixa atual</button><button type="button" className={`border-b-2 px-4 py-3 text-sm font-semibold ${view === "history" ? "border-brand-600 text-brand-700" : "border-transparent text-subdued"}`} onClick={() => setView("history")}>Caixas anteriores</button></div>

    {view === "current" ? (!current ? <Card className="overflow-hidden border-brand-200"><div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700"><LockKeyhole/></div><h2 className="text-xl font-semibold">O caixa desta loja está fechado</h2><p className="mt-2 max-w-2xl text-sm text-subdued">Informe o fundo de caixa disponível para troco. Depois disso, todas as vendas do turno serão organizadas por meio de pagamento.</p></div>{canManage ? <Button className="h-12 px-5" onClick={() => showModal("open")}><Wallet size={19}/>Abrir caixa</Button> : <Badge>Somente visualização</Badge>}</div></Card> : <>
      <div className={`rounded-xl border px-4 py-3 text-sm ${current.reopenedAt ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}><div className="flex items-center gap-2 font-semibold">{current.reopenedAt ? <RotateCcw size={18}/> : <CheckCircle2 size={18}/>} {current.reopenedAt ? `Caixa anterior reaberto em ${dateTime.format(new Date(current.reopenedAt))}. Selecione a data original ao lançar a venda atrasada.` : `Caixa aberto desde ${dateTime.format(new Date(current.openedAt))}`}</div></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><SummaryCard label="Fundo inicial" value={current.openingAmount}/><SummaryCard label="Total de vendas" value={Object.values(current.paymentBreakdown).reduce((total, value) => total + value, 0)} tone="positive"/><SummaryCard label="Vendas em dinheiro" value={current.cashSales} tone="positive"/><SummaryCard label="Suprimentos" value={current.supplies} tone="positive"/><SummaryCard label="Sangrias" value={current.withdrawals} tone="negative"/><SummaryCard label="Saldo esperado" value={current.expectedAmount}/></section>
      {canManage ? <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => showModal("SUPPLY")}><ArrowDownToLine size={18}/>Adicionar dinheiro</Button><Button variant="secondary" onClick={() => showModal("WITHDRAWAL")}><ArrowUpFromLine size={18}/>Fazer sangria</Button><Button variant="danger" onClick={() => showModal("close")}><LockKeyhole size={18}/>Fechar caixa</Button></div> : null}
      <CashReport report={current} open/>
    </>) : null}

    {view === "history" ? <section><div className="mb-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Clock3 size={20}/>Caixas anteriores</h2><p className="text-sm text-subdued">Abra um relatório para conferir os meios de pagamento ou reabra-o para lançar vendas atrasadas. Só pode existir um caixa aberto por loja.</p></div><div className="space-y-3">{query.data?.history.map((report) => <CashReport key={report.id} report={report} onReopen={canManage && !current ? showReopen : undefined}/>)}{query.data?.history.length === 0 ? <Card className="p-6 text-center text-sm text-subdued">Nenhum caixa foi fechado nesta loja ainda.</Card> : null}</div></section> : null}

    <Modal open={modal !== null} onClose={closeModal} className="max-w-lg" title={modal === "open" ? "Abrir caixa" : modal === "SUPPLY" ? "Adicionar dinheiro" : modal === "WITHDRAWAL" ? "Registrar sangria" : modal === "reopen" ? "Reabrir caixa anterior" : "Fechar caixa"} description={modal === "close" ? `O sistema espera ${money.format(current?.expectedAmount ?? 0)}. Informe quanto foi contado fisicamente.` : modal === "open" ? "Informe quanto há disponível para iniciar o atendimento." : modal === "reopen" ? "As próximas vendas serão incluídas neste caixa. Se houver um caixa atual, ele precisa ser fechado primeiro." : "Esta movimentação ficará registrada no relatório deste caixa."}>
      <form className="space-y-4" onSubmit={submit}>{modal === "reopen" ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Caixa aberto em {selectedReport ? dateTime.format(new Date(selectedReport.openedAt)) : "—"}</p><p className="mt-1">Ao terminar os lançamentos atrasados, feche novamente o caixa para atualizar o relatório.</p></div> : <><Input label={modal === "close" ? "Valor contado no caixa" : modal === "open" ? "Fundo inicial" : "Valor"} type="number" min="0" step="0.01" autoFocus value={amount} onChange={(event) => setAmount(event.target.value)}/><Input label={modal === "SUPPLY" || modal === "WITHDRAWAL" ? "Motivo" : "Observação (opcional)"} placeholder={modal === "SUPPLY" ? "Ex.: reforço de troco" : modal === "WITHDRAWAL" ? "Ex.: depósito bancário" : "Opcional"} required={modal === "SUPPLY" || modal === "WITHDRAWAL"} value={description} onChange={(event) => setDescription(event.target.value)}/></>}{modal === "close" && amount ? <div className="rounded-md bg-muted p-3 text-sm"><span>Diferença prevista: </span><strong className={Number(amount.replace(",", ".")) - (current?.expectedAmount ?? 0) < 0 ? "text-danger" : "text-success"}>{money.format(Number(amount.replace(",", ".")) - (current?.expectedAmount ?? 0))}</strong></div> : null}{formError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{formError}</p> : null}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button type="submit" variant={modal === "close" ? "danger" : "primary"} disabled={openMutation.isPending || movementMutation.isPending || closeMutation.isPending || reopenMutation.isPending}>{modal === "close" ? "Confirmar fechamento" : modal === "open" ? "Abrir caixa" : modal === "reopen" ? "Confirmar reabertura" : "Registrar"}</Button></div></form>
    </Modal>
  </div>;
}
