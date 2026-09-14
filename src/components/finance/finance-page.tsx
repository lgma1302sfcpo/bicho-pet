"use client";

import { CheckCircle2, CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataErrorState, DataLoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  useCreateFinancialEntry,
  useDeleteFinancialEntry,
  useFinance,
  useUpdateFinancialStatus,
  type FinancialEntry
} from "@/hooks/use-operations";

const typeLabels = { REVENUE: "Receita", EXPENSE: "Despesa" } as const;
const statusLabels = { PENDING: "Pendente", PAID: "Pago", CANCELLED: "Cancelado" } as const;
const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  STORE_CREDIT: "Fiado",
  VOUCHER: "Vale",
  MIXED: "Pagamento combinado"
};
const receivePaymentOptions = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "VOUCHER"];
const categories = ["Vendas", "Fornecedores", "Aluguel", "Energia eletrica", "Agua", "Internet", "Impostos", "Salarios", "Manutencao", "Marketing", "Outras receitas", "Outras despesas"];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Em aberto";
}

export function FinancePage() {
  const finance = useFinance();
  const createEntry = useCreateFinancialEntry();
  const updateStatus = useUpdateFinancialStatus();
  const deleteEntry = useDeleteFinancialEntry();
  const [type, setType] = useState<keyof typeof typeLabels>("EXPENSE");
  const [status, setStatus] = useState<keyof typeof statusLabels>("PENDING");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[1]);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [receivingEntry, setReceivingEntry] = useState<FinancialEntry | null>(null);
  const [receivePaymentMethod, setReceivePaymentMethod] = useState("CASH");
  const entries = useMemo(() => finance.data ?? [], [finance.data]);
  const filtered = useMemo(() => entries.filter((entry) => {
    const haystack = `${entry.description} ${entry.category} ${entry.customerName ?? ""} ${entry.customerPhone ?? ""} ${entry.saleCode ?? ""}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) &&
      (filterType === "ALL" || entry.type === filterType) &&
      (filterStatus === "ALL" || entry.status === filterStatus);
  }), [entries, filterStatus, filterType, search]);
  const filtersActive = Boolean(search || filterType !== "ALL" || filterStatus !== "ALL");
  const paidRevenue = entries.filter((entry) => entry.type === "REVENUE" && entry.status === "PAID").reduce((sum, entry) => sum + entry.amount, 0);
  const paidExpense = entries.filter((entry) => entry.type === "EXPENSE" && entry.status === "PAID").reduce((sum, entry) => sum + entry.amount, 0);
  const pending = entries.filter((entry) => entry.status === "PENDING").reduce((sum, entry) => sum + entry.amount, 0);

  async function submit() {
    setFeedback(null);
    try {
      await createEntry.mutateAsync({ type, status, description, category, amount, dueDate, paymentMethod, notes });
      setDescription("");
      setAmount("");
      setNotes("");
      setFeedback("Lancamento financeiro salvo com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel salvar o lancamento.");
    }
  }

  async function receiveStoreCredit() {
    if (!receivingEntry) return;
    setFeedback(null);
    try {
      await updateStatus.mutateAsync({ id: receivingEntry.id, status: "PAID", paymentMethod: receivePaymentMethod });
      setFeedback(receivePaymentMethod === "CASH" ? "Fiado recebido e registrado no caixa." : "Fiado recebido e marcado como pago.");
      setReceivingEntry(null);
      setReceivePaymentMethod("CASH");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel receber o fiado.");
    }
  }

  if (finance.isPending) {
    return <div className="erp-page"><div><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-sm text-subdued">Controle de receitas, despesas, vencimentos e pagamentos.</p></div><DataLoadingState label="Carregando lancamentos financeiros..." /></div>;
  }

  if (finance.isError) {
    return <div className="erp-page"><div><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-sm text-subdued">Controle de receitas, despesas, vencimentos e pagamentos.</p></div><DataErrorState message={finance.error.message} onRetry={() => void finance.refetch()} /></div>;
  }

  return <div className="erp-page">
    <div><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-sm text-subdued">Controle de receitas, despesas, vencimentos e pagamentos.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Receitas recebidas", money(paidRevenue)], ["Despesas pagas", money(paidExpense)], ["Saldo realizado", money(paidRevenue - paidExpense)], ["Total pendente", money(pending)]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-sm text-subdued">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}
    </section>
    {feedback ? <p className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{feedback}</p> : null}
    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="space-y-5">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Filtros financeiros</h2>
            {filtersActive ? <Badge className="border-brand-200 bg-brand-50 text-brand-700">Filtro aplicado: {filtered.length} resultado(s)</Badge> : <Badge>Todos os lancamentos</Badge>}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Buscar lancamento" placeholder="cliente, venda, descricao ou categoria" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select label="Tipo" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
              <option value="ALL">Receitas e despesas</option>
              <option value="REVENUE">Somente receitas</option>
              <option value="EXPENSE">Somente despesas</option>
            </Select>
            <Select label="Situacao" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="ALL">Todas as situacoes</option>
              <option value="PENDING">Pendentes</option>
              <option value="PAID">Pagos</option>
              <option value="CANCELLED">Cancelados</option>
            </Select>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-subdued">
                <tr>
                  <th className="px-4 py-3">Lancamento</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Situacao</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3"><p className="font-medium">{entry.description}</p><p className="text-xs text-subdued">{entry.category}{entry.paymentMethod ? ` - ${paymentLabels[entry.paymentMethod] ?? entry.paymentMethod}` : ""}{entry.saleCode ? ` - Venda ${entry.saleCode}` : ""}</p></td>
                    <td className="px-4 py-3"><p className="font-medium">{entry.customerName ?? "-"}</p>{entry.customerPhone ? <p className="text-xs text-subdued">{entry.customerPhone}</p> : null}</td>
                    <td className="px-4 py-3">{typeLabels[entry.type]}</td>
                    <td className="px-4 py-3">{formatDate(entry.dueDate)}</td>
                    <td className="px-4 py-3">{entry.paidAt ? formatDate(entry.paidAt) : <span className="text-subdued">Em aberto</span>}</td>
                    <td className="px-4 py-3"><Badge>{statusLabels[entry.status]}</Badge></td>
                    <td className={`px-4 py-3 font-semibold ${entry.type === "REVENUE" ? "text-success" : "text-danger"}`}>{entry.type === "REVENUE" ? "+" : "-"} {money(entry.amount)}</td>
                    <td className="px-4 py-3"><div className="flex gap-2">{entry.status === "PENDING" ? entry.paymentMethod === "STORE_CREDIT" ? <Button variant="secondary" title="Receber fiado" onClick={() => { setReceivingEntry(entry); setReceivePaymentMethod("CASH"); }}><CheckCircle2 size={16} />Receber</Button> : <Button variant="secondary" title="Marcar como pago" onClick={() => updateStatus.mutate({ id: entry.id, status: "PAID", paymentMethod: entry.paymentMethod ?? undefined })}><CheckCircle2 size={16} />Pagar</Button> : null}{!entry.saleId ? <Button variant="danger" title="Excluir lancamento" onClick={() => window.confirm(`Excluir ${entry.description}?`) && deleteEntry.mutate(entry.id)}><Trash2 size={16} /></Button> : null}</div></td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-subdued">Nenhum lancamento encontrado com os filtros atuais.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card className="h-fit p-4"><div className="mb-4 flex items-center gap-2"><CircleDollarSign size={19} className="text-brand-700" /><h2 className="font-semibold">Novo lancamento</h2></div><div className="space-y-3"><Select label="Tipo" help="Receita representa dinheiro que entra. Despesa representa dinheiro que sai." value={type} onChange={(event) => setType(event.target.value as keyof typeof typeLabels)}><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></Select><Input label="Descricao" mask="letters" placeholder="Exemplo: compra de racoes" value={description} onChange={(event) => setDescription(event.target.value)} /><Select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Valor" help="Valor total que sera recebido ou pago." mask="currency" value={amount} onChange={(event) => setAmount(event.target.value)} /><Input label="Data de vencimento" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><Select label="Situacao" value={status} onChange={(event) => setStatus(event.target.value as keyof typeof statusLabels)}><option value="PENDING">Pendente</option><option value="PAID">Pago</option><option value="CANCELLED">Cancelado</option></Select><Select label="Meio de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Input label="Observacoes" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button className="w-full" disabled={createEntry.isPending || !description || !amount} onClick={submit}><Plus size={17} />Cadastrar lancamento</Button></div></Card>
    </section>
    <Modal open={receivingEntry !== null} onClose={() => { if (!updateStatus.isPending) setReceivingEntry(null); }} className="max-w-lg" title="Receber venda fiada" description={receivingEntry ? `${receivingEntry.customerName ?? "Cliente"} - ${money(receivingEntry.amount)}` : undefined}>
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted p-3 text-sm">
          <p><strong>Venda:</strong> {receivingEntry?.saleCode ?? receivingEntry?.description}</p>
          <p><strong>Vencimento:</strong> {formatDate(receivingEntry?.dueDate)}</p>
          <p><strong>Valor em aberto:</strong> {receivingEntry ? money(receivingEntry.amount) : "-"}</p>
        </div>
        <Select label="Forma de recebimento" value={receivePaymentMethod} onChange={(event) => setReceivePaymentMethod(event.target.value)}>
          {receivePaymentOptions.map((method) => <option key={method} value={method}>{paymentLabels[method]}</option>)}
        </Select>
        {receivePaymentMethod === "CASH" ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Recebimento em dinheiro entra no caixa aberto da loja.</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={updateStatus.isPending} onClick={() => setReceivingEntry(null)}>Voltar</Button>
          <Button disabled={updateStatus.isPending} onClick={() => void receiveStoreCredit()}><CheckCircle2 size={16} />{updateStatus.isPending ? "Recebendo..." : "Confirmar recebimento"}</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
