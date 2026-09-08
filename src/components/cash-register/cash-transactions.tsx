"use client";

import { ChevronDown, Pencil, ReceiptText, RefreshCw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PaymentMethodIcon } from "@/components/cash-register/payment-method-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useCancelSale, useCashTransactions, useCorrectSalePayment } from "@/hooks/use-cash-register";
import type { CashRegisterReport, CashSaleTransaction, PaymentMethod } from "@/types/cash-register";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", PIX: "Pix",
  STORE_CREDIT: "Fiado / crediário", VOUCHER: "Vale", MIXED: "Pagamento misto"
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function Items({ sale }: { sale: CashSaleTransaction }) {
  return <details className="group min-w-[220px]">
    <summary className="cursor-pointer list-none font-medium text-brand-700"><span className="inline-flex items-center gap-1"><ChevronDown size={15} className="transition group-open:rotate-180"/>{sale.items.length} item(ns): {sale.items.slice(0, 2).map((item) => item.description).join(", ")}{sale.items.length > 2 ? "…" : ""}</span></summary>
    <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/40 p-2 text-xs">
      {sale.items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span>{quantity.format(item.quantity)} {item.unit ?? "un"} × {item.description}{item.discount ? ` (desc. ${money.format(item.discount)})` : ""}</span><strong className="whitespace-nowrap">{money.format(item.total)}</strong></div>)}
      {sale.notes ? <p className="border-t border-border pt-1 text-subdued">Obs.: {sale.notes}</p> : null}
    </div>
  </details>;
}

export function CashTransactions({ report, canManage }: { report: CashRegisterReport; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<PaymentMethod | "">("");
  const [selected, setSelected] = useState<CashSaleTransaction | null>(null);
  const [selectedToCancel, setSelectedToCancel] = useState<CashSaleTransaction | null>(null);
  const [nextMethod, setNextMethod] = useState<PaymentMethod | "">("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const query = useCashTransactions(report.id, filter, open);
  const correction = useCorrectSalePayment();
  const cancellation = useCancelSale();

  function startCorrection(sale: CashSaleTransaction) { setSelected(sale); setNextMethod(""); setReason(""); setFormError(null); }
  async function submitCorrection(event: FormEvent) {
    event.preventDefault();
    if (!selected || !nextMethod) return setFormError("Selecione a forma de pagamento correta.");
    try { setFormError(null); await correction.mutateAsync({ saleId: selected.id, paymentMethod: nextMethod, reason }); setSelected(null); }
    catch (error) { setFormError(message(error)); }
  }
  async function submitCancellation(event: FormEvent) {
    event.preventDefault();
    if (!selectedToCancel) return;
    try {
      setCancellationError(null);
      await cancellation.mutateAsync({ saleId: selectedToCancel.id, reason: cancellationReason });
      setSelectedToCancel(null);
      setCancellationReason("");
    } catch (error) {
      setCancellationError(message(error));
    }
  }

  return <div className="border-t border-border">
    <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-brand-700 hover:bg-muted/50" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="flex items-center gap-2"><ReceiptText size={18}/>Ver vendas e transações deste caixa ({report.salesCount})</span><ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`}/>
    </button>
    {open ? <div className="border-t border-border bg-slate-50/60 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Select label="Filtrar por forma de pagamento" className="sm:w-64" value={filter} onChange={(event) => setFilter(event.target.value as PaymentMethod | "")}><option value="">Todas as formas</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        {query.data ? <p className="text-sm text-subdued"><strong className="text-ink">{query.data.sales.length}</strong> venda(s) • <strong className="text-ink">{money.format(query.data.total)}</strong></p> : null}
      </div>
      {query.isLoading || query.isFetching ? <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white p-8 text-sm text-subdued"><RefreshCw size={18} className="animate-spin"/>Carregando vendas...</div> : null}
      {query.isError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">{message(query.error)} <Button variant="ghost" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : null}
      {query.data && !query.isFetching ? <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="w-full min-w-[940px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-3 py-3">Data e hora</th><th className="px-3 py-3">Venda</th><th className="px-3 py-3">Produtos</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Pagamento</th><th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Ação</th></tr></thead>
        <tbody className="divide-y divide-border">{query.data.sales.map((sale) => <tr key={sale.id} className={`align-top hover:bg-muted/30 ${sale.status === "CANCELLED" ? "bg-red-50/60 text-subdued" : ""}`}>
          <td className="whitespace-nowrap px-3 py-3">{dateTime.format(new Date(sale.soldAt))}</td><td className="px-3 py-3"><strong>{sale.code}</strong><p className="mt-1 text-xs text-subdued">por {sale.userName ?? "não identificado"}</p></td><td className="px-3 py-3"><Items sale={sale}/></td><td className="px-3 py-3">{sale.customerName ?? "Consumidor não identificado"}</td>
          <td className="px-3 py-3"><div className="space-y-1">{sale.payments.map((payment) => <div key={payment.method} className="flex items-center gap-2 whitespace-nowrap font-medium"><PaymentMethodIcon method={payment.method} compact/>{paymentLabels[payment.method]}: {money.format(payment.amount)}</div>)}</div>{sale.status === "CANCELLED" ? <div className="mt-2 max-w-xs rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"><strong>Venda cancelada</strong><br/>{sale.cancellationReason}<br/>{sale.cancelledByName ?? "usuário"}{sale.cancelledAt ? ` em ${dateTime.format(new Date(sale.cancelledAt))}` : ""}</div> : null}{sale.corrections.length ? <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-amber-700">Corrigido {sale.corrections.length} vez(es)</summary><div className="mt-1 max-w-xs space-y-2 text-xs text-subdued">{sale.corrections.map((item) => <p key={item.id}>{paymentLabels[item.oldPaymentMethod]} → {paymentLabels[item.newPaymentMethod]}<br/>{item.reason} • {item.correctedByName ?? "usuário"} em {dateTime.format(new Date(item.createdAt))}</p>)}</div></details> : null}</td>
          <td className={`px-3 py-3 text-right font-bold ${sale.status === "CANCELLED" ? "line-through" : ""}`}>{money.format(sale.total)}</td><td className="px-3 py-3 text-right">{sale.status === "CANCELLED" ? <span className="text-xs font-semibold text-red-700">Cancelada</span> : canManage && report.status === "OPEN" ? <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => startCorrection(sale)}><Pencil size={15}/>Corrigir</Button><Button variant="danger" onClick={() => { setSelectedToCancel(sale); setCancellationReason(""); setCancellationError(null); }}><Trash2 size={15}/>Cancelar</Button></div> : <span className="text-xs text-subdued">{canManage ? "Reabra para alterar" : "Somente leitura"}</span>}</td>
        </tr>)}</tbody>
      </table>{!query.data.sales.length ? <p className="p-8 text-center text-sm text-subdued">Nenhuma venda encontrada para este filtro.</p> : null}</div> : null}
    </div> : null}
    <Modal open={selected !== null} onClose={() => { if (!correction.isPending) setSelected(null); }} className="max-w-lg" title="Corrigir forma de pagamento" description={selected ? `Venda ${selected.code} • atual: ${paymentLabels[selected.paymentMethod]}` : undefined}>
      <form className="space-y-4" onSubmit={submitCorrection}><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">A correção ficará registrada no histórico e atualizará o fechamento do caixa e o financeiro.</div>
        <Select label="Forma de pagamento correta" required value={nextMethod} onChange={(event) => setNextMethod(event.target.value as PaymentMethod | "")}><option value="">Selecione</option>{Object.entries(paymentLabels).filter(([value]) => value !== selected?.paymentMethod).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Input label="Motivo da correção" required minLength={3} maxLength={300} placeholder="Ex.: lançado como Pix, mas a maquininha confirma débito" value={reason} onChange={(event) => setReason(event.target.value)}/>{formError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{formError}</p> : null}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSelected(null)} disabled={correction.isPending}>Cancelar</Button><Button type="submit" disabled={correction.isPending}>{correction.isPending ? "Corrigindo..." : "Confirmar correção"}</Button></div>
      </form>
    </Modal>
    <Modal open={selectedToCancel !== null} onClose={() => { if (!cancellation.isPending) setSelectedToCancel(null); }} className="max-w-lg" title="Cancelar venda" description={selectedToCancel ? `Venda ${selectedToCancel.code} • ${money.format(selectedToCancel.total)}` : undefined}>
      <form className="space-y-4" onSubmit={submitCancellation}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><strong>Atenção:</strong> os produtos voltarão ao estoque e o valor será estornado do caixa e do financeiro. A venda continuará registrada como cancelada.</div>
        <Input label="Motivo do cancelamento" required minLength={3} maxLength={300} autoFocus placeholder="Ex.: venda lançada com produtos errados" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)}/>
        {cancellationError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{cancellationError}</p> : null}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSelectedToCancel(null)} disabled={cancellation.isPending}>Voltar</Button><Button type="submit" variant="danger" disabled={cancellation.isPending}>{cancellation.isPending ? "Cancelando..." : "Confirmar cancelamento"}</Button></div>
      </form>
    </Modal>
  </div>;
}
