"use client";

import { ArrowDownRight, ArrowUpRight, Banknote, PackageSearch } from "lucide-react";
import React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-operations";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function DashboardOverview() {
  const dashboard = useDashboard();
  const data = dashboard.data;

  if (dashboard.isPending) {
    return <DashboardLoading />;
  }

  if (dashboard.isError || !data) {
    return (
      <div className="space-y-5">
        <div><h1 className="text-2xl font-semibold text-ink">Visão geral</h1><p className="text-sm text-subdued">Indicadores calculados diretamente com vendas, estoque e financeiro.</p></div>
        <Card className="border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-danger">Não foi possível carregar os indicadores.</p>
          <p className="mt-1 text-sm text-subdued">Confira sua conexão e tente novamente.</p>
          <button className="mt-4 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => dashboard.refetch()}>
            Tentar novamente
          </button>
        </Card>
      </div>
    );
  }

  const metrics = [
    { label: "Faturamento dos últimos 30 dias", value: money(data.metrics.revenue), hint: "Calculado com as vendas registradas", icon: ArrowUpRight },
    { label: "Lucro bruto dos últimos 30 dias", value: money(data.metrics.grossProfit), hint: `${data.metrics.margin.toFixed(1)}% de margem sobre as vendas`, icon: Banknote },
    { label: "Despesas pendentes", value: money(data.metrics.pendingExpenses), hint: "Lançamentos ainda não pagos", icon: ArrowDownRight },
    { label: "Produtos com estoque baixo", value: String(data.metrics.lowStock), hint: "Produtos que precisam de reposição", icon: PackageSearch }
  ];

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-ink">Visão geral</h1><p className="text-sm text-subdued">Indicadores calculados diretamente com vendas, estoque e financeiro.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const Icon = metric.icon; return <Card key={metric.label} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-subdued">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-subdued">{metric.hint}</p></div><div className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700"><Icon size={18} /></div></div></Card>; })}</section>
    <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <Card className="min-w-0 p-4"><h2 className="font-semibold">Movimento dos últimos sete dias</h2><p className="mb-4 text-sm text-subdued">Vendas e despesas pagas em cada dia.</p><div className="h-64 min-w-0 sm:h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.cashFlow}><CartesianGrid stroke="#e6ebf2" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={45} /><Tooltip formatter={(value) => money(Number(value))} /><Line name="Vendas" type="monotone" dataKey="revenue" stroke="#16875a" strokeWidth={3} /><Line name="Despesas" type="monotone" dataKey="expense" stroke="#c2413b" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
      <Card className="min-w-0 p-4"><h2 className="font-semibold">Produtos mais vendidos</h2><p className="mb-4 text-sm text-subdued">Quantidade vendida nos últimos 30 dias.</p><div className="h-64 min-w-0 sm:h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topProducts} layout="vertical"><CartesianGrid stroke="#e6ebf2" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} /><YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} /><Tooltip /><Bar name="Quantidade" dataKey="quantity" fill="#0b84d8" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Últimas vendas registradas</h2></div><div className="divide-y divide-border">{data.latestSales.map((sale) => <div key={sale.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold">{sale.customerName}</p><p className="break-words text-subdued">{sale.code} · {sale.paymentMethod} · {new Date(sale.soldAt).toLocaleString("pt-BR")}</p></div><strong>{money(sale.total)}</strong></div>)}{!data.latestSales.length ? <p className="p-5 text-center text-sm text-subdued">Nenhuma venda registrada.</p> : null}</div></Card>
      <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Próximas despesas</h2></div><div className="divide-y divide-border">{data.upcomingExpenses.map((entry) => <div key={entry.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{entry.description}</p><p className="text-subdued">Vencimento em {new Date(entry.dueDate).toLocaleDateString("pt-BR")}</p></div><strong className="text-danger">{money(entry.amount)}</strong></div>)}{!data.upcomingExpenses.length ? <p className="p-5 text-center text-sm text-subdued">Nenhuma despesa pendente.</p> : null}</div></Card>
    </section>
  </div>;
}

function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando indicadores da loja">
      <div><h1 className="text-2xl font-semibold text-ink">Visão geral</h1><p className="text-sm text-subdued">Carregando os indicadores da loja...</p></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Card key={index} className="animate-pulse p-4"><div className="h-4 w-3/4 rounded bg-slate-200"/><div className="mt-4 h-8 w-1/2 rounded bg-slate-200"/><div className="mt-3 h-3 w-4/5 rounded bg-slate-100"/></Card>)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="animate-pulse p-4"><div className="h-5 w-52 rounded bg-slate-200"/><div className="mt-5 h-64 rounded-lg bg-slate-100 sm:h-72"/></Card>
        <Card className="animate-pulse p-4"><div className="h-5 w-44 rounded bg-slate-200"/><div className="mt-5 h-64 rounded-lg bg-slate-100 sm:h-72"/></Card>
      </section>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
