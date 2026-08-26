"use client";

import { CheckCircle2, CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateFinancialEntry, useDeleteFinancialEntry, useFinance, useUpdateFinancialStatus } from "@/hooks/use-operations";

const typeLabels = { REVENUE: "Receita", EXPENSE: "Despesa" } as const;
const statusLabels = { PENDING: "Pendente", PAID: "Pago", CANCELLED: "Cancelado" } as const;
const paymentLabels: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", STORE_CREDIT: "Crédito da loja", VOUCHER: "Vale", MIXED: "Pagamento combinado" };
const categories = ["Vendas", "Fornecedores", "Aluguel", "Energia elétrica", "Água", "Internet", "Impostos", "Salários", "Manutenção", "Marketing", "Outras receitas", "Outras despesas"];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
  const entries = useMemo(() => finance.data ?? [], [finance.data]);
  const filtered = useMemo(() => entries.filter((entry) => (!search || `${entry.description} ${entry.category}`.toLowerCase().includes(search.toLowerCase())) && (filterType === "ALL" || entry.type === filterType) && (filterStatus === "ALL" || entry.status === filterStatus)), [entries, filterStatus, filterType, search]);
  const filtersActive = Boolean(search || filterType !== "ALL" || filterStatus !== "ALL");
  const paidRevenue = entries.filter((entry) => entry.type === "REVENUE" && entry.status === "PAID").reduce((sum, entry) => sum + entry.amount, 0);
  const paidExpense = entries.filter((entry) => entry.type === "EXPENSE" && entry.status === "PAID").reduce((sum, entry) => sum + entry.amount, 0);
  const pending = entries.filter((entry) => entry.status === "PENDING").reduce((sum, entry) => sum + entry.amount, 0);

  async function submit() {
    setFeedback(null);
    try {
      await createEntry.mutateAsync({ type, status, description, category, amount, dueDate, paymentMethod, notes });
      setDescription(""); setAmount(""); setNotes(""); setFeedback("Lançamento financeiro salvo com sucesso.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível salvar o lançamento."); }
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-sm text-subdued">Controle de receitas, despesas, vencimentos e pagamentos.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Receitas recebidas", money(paidRevenue)], ["Despesas pagas", money(paidExpense)], ["Saldo realizado", money(paidRevenue - paidExpense)], ["Total pendente", money(pending)]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-sm text-subdued">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <div className="space-y-5">
        <Card className="p-4"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Filtros financeiros</h2>{filtersActive ? <Badge className="border-brand-200 bg-brand-50 text-brand-700">Filtro aplicado: {filtered.length} resultado(s)</Badge> : <Badge>Todos os lançamentos</Badge>}</div><div className="grid gap-3 md:grid-cols-3"><Input label="Buscar lançamento" placeholder="Descrição ou categoria" value={search} onChange={(event) => setSearch(event.target.value)} /><Select label="Tipo" value={filterType} onChange={(event) => setFilterType(event.target.value)}><option value="ALL">Receitas e despesas</option><option value="REVENUE">Somente receitas</option><option value="EXPENSE">Somente despesas</option></Select><Select label="Situação" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="ALL">Todas as situações</option><option value="PENDING">Pendentes</option><option value="PAID">Pagos</option><option value="CANCELLED">Cancelados</option></Select></div></Card>
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Lançamento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Ações</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((entry) => <tr key={entry.id}><td className="px-4 py-3"><p className="font-medium">{entry.description}</p><p className="text-xs text-subdued">{entry.category}{entry.paymentMethod ? ` · ${paymentLabels[entry.paymentMethod] ?? entry.paymentMethod}` : ""}</p></td><td className="px-4 py-3">{typeLabels[entry.type]}</td><td className="px-4 py-3">{new Date(entry.dueDate).toLocaleDateString("pt-BR")}</td><td className="px-4 py-3"><Badge>{statusLabels[entry.status]}</Badge></td><td className={`px-4 py-3 font-semibold ${entry.type === "REVENUE" ? "text-success" : "text-danger"}`}>{entry.type === "REVENUE" ? "+" : "-"} {money(entry.amount)}</td><td className="px-4 py-3"><div className="flex gap-2">{entry.status === "PENDING" ? <Button variant="secondary" title="Marcar como pago" onClick={() => updateStatus.mutate({ id: entry.id, status: "PAID" })}><CheckCircle2 size={16} />Pagar</Button> : null}{!entry.saleId ? <Button variant="danger" title="Excluir lançamento" onClick={() => window.confirm(`Excluir ${entry.description}?`) && deleteEntry.mutate(entry.id)}><Trash2 size={16} /></Button> : null}</div></td></tr>)}{!filtered.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-subdued">Nenhum lançamento encontrado com os filtros atuais.</td></tr> : null}</tbody></table></div></Card>
      </div>
      <Card className="h-fit p-4"><div className="mb-4 flex items-center gap-2"><CircleDollarSign size={19} className="text-brand-700" /><h2 className="font-semibold">Novo lançamento</h2></div><div className="space-y-3"><Select label="Tipo" help="Receita representa dinheiro que entra. Despesa representa dinheiro que sai." value={type} onChange={(event) => setType(event.target.value as keyof typeof typeLabels)}><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></Select><Input label="Descrição" mask="letters" placeholder="Exemplo: compra de rações" value={description} onChange={(event) => setDescription(event.target.value)} /><Select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Valor" help="Valor total que será recebido ou pago." mask="currency" value={amount} onChange={(event) => setAmount(event.target.value)} /><Input label="Data de vencimento" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><Select label="Situação" value={status} onChange={(event) => setStatus(event.target.value as keyof typeof statusLabels)}><option value="PENDING">Pendente</option><option value="PAID">Pago</option><option value="CANCELLED">Cancelado</option></Select><Select label="Meio de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Input label="Observações" value={notes} onChange={(event) => setNotes(event.target.value)} />{feedback ? <p className="rounded-md bg-muted p-3 text-sm">{feedback}</p> : null}<Button className="w-full" disabled={createEntry.isPending || !description || !amount} onClick={submit}><Plus size={17} />Cadastrar lançamento</Button></div></Card>
    </section>
  </div>;
}
