"use client";

import { ArrowDownRight, ArrowUpRight, Banknote, PackageSearch } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-operations";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function DashboardOverview() {
  const dashboard = useDashboard();
  const data = dashboard.data;
  const metrics = [
    { label: "Faturamento dos ultimos 30 dias", value: money(data?.metrics.revenue ?? 0), hint: "Calculado com as vendas registradas", icon: ArrowUpRight },
    { label: "Lucro bruto dos ultimos 30 dias", value: money(data?.metrics.grossProfit ?? 0), hint: `${(data?.metrics.margin ?? 0).toFixed(1)}% de margem sobre as vendas`, icon: Banknote },
    { label: "Despesas pendentes", value: money(data?.metrics.pendingExpenses ?? 0), hint: "Lancamentos ainda nao pagos", icon: ArrowDownRight },
    { label: "Produtos com estoque baixo", value: String(data?.metrics.lowStock ?? 0), hint: "Produtos que precisam de reposicao", icon: PackageSearch }
  ];

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-ink">Visao geral</h1><p className="text-sm text-subdued">Indicadores calculados diretamente com vendas, estoque e financeiro.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <Card key={metric.label} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-subdued">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-subdued">{metric.hint}</p></div><div className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700"><Icon size={18} /></div></div></Card>; })}</section>
    <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <Card className="p-4"><h2 className="font-semibold">Movimento dos ultimos sete dias</h2><p className="mb-4 text-sm text-subdued">Vendas e despesas pagas em cada dia.</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.cashFlow ?? []}><CartesianGrid stroke="#e6ebf2" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip formatter={(value) => money(Number(value))} /><Line name="Vendas" type="monotone" dataKey="revenue" stroke="#16875a" strokeWidth={3} /><Line name="Despesas" type="monotone" dataKey="expense" stroke="#c2413b" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h2 className="font-semibold">Produtos mais vendidos</h2><p className="mb-4 text-sm text-subdued">Quantidade vendida nos ultimos 30 dias.</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.topProducts ?? []} layout="vertical"><CartesianGrid stroke="#e6ebf2" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} /><YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} /><Tooltip /><Bar name="Quantidade" dataKey="quantity" fill="#0b84d8" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Ultimas vendas registradas</h2></div><div className="divide-y divide-border">{(data?.latestSales ?? []).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-semibold">{sale.customerName}</p><p className="text-subdued">{sale.code} · {sale.paymentMethod} · {new Date(sale.soldAt).toLocaleString("pt-BR")}</p></div><strong>{money(sale.total)}</strong></div>)}{!data?.latestSales.length ? <p className="p-5 text-center text-sm text-subdued">Nenhuma venda registrada.</p> : null}</div></Card>
      <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Proximas despesas</h2></div><div className="divide-y divide-border">{(data?.upcomingExpenses ?? []).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-semibold">{entry.description}</p><p className="text-subdued">Vencimento em {new Date(entry.dueDate).toLocaleDateString("pt-BR")}</p></div><strong className="text-danger">{money(entry.amount)}</strong></div>)}{!data?.upcomingExpenses.length ? <p className="p-5 text-center text-sm text-subdued">Nenhuma despesa pendente.</p> : null}</div></Card>
    </section>
  </div>;
}
