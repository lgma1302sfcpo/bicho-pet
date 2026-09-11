"use client";

import { Download, FileBarChart, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataErrorState, DataLoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { SaleListItemDTO } from "@/dtos/commerce/sale.dto";
import { useSales } from "@/hooks/commerce/use-commerce";
import { downloadXlsx } from "@/lib/xlsx-export";

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito",
  STORE_CREDIT: "Fiado", VOUCHER: "Vale", MIXED: "Pagamento múltiplo"
};

const speciesLabels: Record<string, string> = {
  ALL: "Todas/geral", DOG: "Cachorro", CAT: "Gato", BIRD: "Ave", FISH: "Peixe", RODENT: "Roedor", OTHER: "Outra espécie"
};

type AnalyticRow = { name: string; quantity: number; revenue: number; cost: number; profit: number };

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getPeriodStart(period: string) {
  const now = new Date();
  if (period === "all" || period === "custom") return null;
  if (period === "today") return startOfDay(now);
  if (period === "yesterday") {
    const result = startOfDay(now);
    result.setDate(result.getDate() - 1);
    return result;
  }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  const result = startOfDay(now);
  result.setDate(result.getDate() - Math.max(Number(period) - 1, 0));
  return result;
}

function aggregateItems(sales: SaleListItemDTO[], key: (item: SaleListItemDTO["items"][number]) => string) {
  const rows = new Map<string, AnalyticRow>();
  for (const sale of sales) {
    const revenueFactor = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
    for (const item of sale.items) {
      const name = key(item) || "Não informado";
      const current = rows.get(name) ?? { name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
      current.quantity += item.quantity;
      current.revenue += item.total * revenueFactor;
      current.cost += item.costPrice * item.quantity;
      current.profit = current.revenue - current.cost;
      rows.set(name, current);
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
}

function financialExportRows(rows: AnalyticRow[]) {
  return rows.map((row) => {
    const unitCost = row.quantity > 0 ? row.cost / row.quantity : 0;
    const unitRevenue = row.quantity > 0 ? row.revenue / row.quantity : 0;
    const profit = Math.max(row.profit, 0);
    const loss = Math.max(-row.profit, 0);
    const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;

    return {
      Produto: row.name,
      Quantidade: row.quantity,
      "Custo Un. (R$)": unitCost,
      "Total Custo (R$)": row.cost,
      "Vendas Un. (R$)": unitRevenue,
      "Total Vendas (R$)": row.revenue,
      "Lucro (R$)": profit,
      "Lucro (%)": profit > 0 ? margin : 0,
      "Prejuizo (R$)": loss,
      "Prejuizo (%)": loss > 0 ? Math.abs(margin) : 0
    };
  });
}

function AnalyticTable({ title, rows }: { title: string; rows: AnalyticRow[] }) {
  return (
    <Card className="erp-table-card overflow-hidden">
      <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">{title}</h2></div>
      <div className="erp-table-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Quantidade</th><th className="px-4 py-3">Custo</th><th className="px-4 py-3">Vendas</th><th className="px-4 py-3">Lucro</th><th className="px-4 py-3">Margem</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => <tr key={row.name}><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</td><td className="px-4 py-3">{money(row.cost)}</td><td className="px-4 py-3">{money(row.revenue)}</td><td className="px-4 py-3 font-semibold">{money(row.profit)}</td><td className="px-4 py-3">{row.revenue ? `${((row.profit / row.revenue) * 100).toFixed(1)}%` : "0%"}</td></tr>)}
            {!rows.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-subdued">Nenhum dado encontrado neste período.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SalesReportPage() {
  const salesQuery = useSales();
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("");
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const suppliers = useMemo(() => Array.from(new Set((salesQuery.data ?? [])
    .flatMap((sale) => sale.items.map((item) => item.supplier?.trim()))
    .filter((supplier): supplier is string => Boolean(supplier))))
    .sort((a, b) => a.localeCompare(b, "pt-BR")), [salesQuery.data]);

  const periodSales = useMemo(() => (salesQuery.data ?? []).flatMap((sale) => {
    const soldAt = new Date(sale.soldAt);
    const periodStart = getPeriodStart(period);
    const yesterdayEnd = period === "yesterday" ? new Date(startOfDay(new Date()).getTime() - 1) : null;
    const matchesFrom = period !== "custom" || !from || soldAt >= new Date(`${from}T00:00:00`);
    const matchesTo = period !== "custom" || !to || soldAt <= new Date(`${to}T23:59:59`);
    if ((periodStart && soldAt < periodStart) || (yesterdayEnd && soldAt > yesterdayEnd) || !matchesFrom || !matchesTo) return [];

    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return [sale];
    const saleMatches = `${sale.code} ${sale.branchName} ${sale.customerName ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
    if (saleMatches) return [sale];

    const filteredItems = sale.items.filter((item) => `${item.description} ${item.supplier ?? ""} ${item.brand ?? ""} ${item.category ?? ""} ${speciesLabels[item.species ?? ""] ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
    if (!filteredItems.length) return [];
    const filteredSubtotal = filteredItems.reduce((sum, item) => sum + item.total, 0);
    const revenueFactor = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
    return [{ ...sale, items: filteredItems, itemsCount: filteredItems.length, subtotal: filteredSubtotal, discount: 0, surcharge: 0, total: filteredSubtotal * revenueFactor }];
  }), [from, period, salesQuery.data, search, to]);

  const sales = useMemo(() => {
    if (!species) return periodSales;
    return periodSales.flatMap((sale) => {
      const filteredItems = sale.items.filter((item) => item.species === species);
      if (!filteredItems.length) return [];
      const filteredSubtotal = filteredItems.reduce((sum, item) => sum + item.total, 0);
      const revenueFactor = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
      return [{
        ...sale,
        items: filteredItems,
        itemsCount: filteredItems.length,
        subtotal: filteredSubtotal,
        discount: 0,
        surcharge: 0,
        total: filteredSubtotal * revenueFactor
      }];
    });
  }, [periodSales, species]);

  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cost = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.costPrice * item.quantity, 0), 0);
  const profit = revenue - cost;
  const ticket = sales.length ? revenue / sales.length : 0;
  const byCategory = aggregateItems(sales, (item) => `${item.category ?? "Sem categoria"} / ${item.description}`);
  const byProduct = aggregateItems(sales, (item) => item.description);
  const bySupplier = aggregateItems(sales, (item) => item.supplier ?? "Fornecedor não informado");
  const bySpecies = aggregateItems(sales, (item) => speciesLabels[item.species ?? ""] ?? "Espécie não informada")
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  const byPayment = Object.values(sales.reduce<Record<string, { name: string; sales: number; revenue: number }>>((groups, sale) => {
    const name = paymentLabels[sale.paymentMethod] ?? sale.paymentMethod;
    const current = groups[sale.paymentMethod] ?? { name, sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue += sale.total;
    groups[sale.paymentMethod] = current;
    return groups;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const byHour = Object.values(sales.reduce<Record<string, { name: string; sales: number; revenue: number }>>((groups, sale) => {
    const name = `${new Date(sale.soldAt).getHours().toString().padStart(2, "0")}:00`;
    const current = groups[name] ?? { name, sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue += sale.total;
    groups[name] = current;
    return groups;
  }, {})).sort((a, b) => a.name.localeCompare(b.name));

  function exportSpreadsheet() {
    downloadXlsx(`relatorios-gerenciais-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: "Vendas", rows: sales.map((sale) => ({ Loja: sale.branchName, Código: sale.code, Data: new Date(sale.soldAt).toLocaleString("pt-BR"), Cliente: sale.customerName ?? "Consumidor final", Pagamento: paymentLabels[sale.paymentMethod] ?? sale.paymentMethod, Itens: sale.itemsCount, Custo: sale.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0), Total: sale.total })) },
      { name: "Pagamentos", rows: byPayment },
      { name: "Categoria e produto", rows: financialExportRows(byCategory) },
      { name: "Produtos vendidos", rows: financialExportRows(byProduct) },
      { name: "Espécies", rows: financialExportRows(bySpecies) },
      { name: "Fornecedores", rows: financialExportRows(bySupplier) }
    ]);
  }

  if (salesQuery.isPending) {
    return <div className="erp-page"><div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Relatórios gerenciais</h1><p className="text-sm text-subdued">Vendas, lucratividade, pagamentos, produtos e fornecedores.</p></div></div><DataLoadingState label="Carregando vendas e indicadores do relatório..." /></div>;
  }

  if (salesQuery.isError) {
    return <div className="erp-page"><div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Relatórios gerenciais</h1><p className="text-sm text-subdued">Vendas, lucratividade, pagamentos, produtos e fornecedores.</p></div></div><DataErrorState message={salesQuery.error.message} onRetry={() => void salesQuery.refetch()} /></div>;
  }

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div><h1 className="text-2xl font-semibold text-ink">Relatórios gerenciais</h1><p className="text-sm text-subdued">Vendas, lucratividade, pagamentos, produtos e fornecedores.</p></div>
        <div className="erp-page-header__actions"><Button onClick={exportSpreadsheet} disabled={!sales.length}><Download size={18} /> Exportar Excel</Button></div>
      </div>

      <Card className="erp-filter-card p-4">
        <div className="mb-4 flex items-center gap-2"><FileBarChart size={18} className="text-brand-700" /><h2 className="font-semibold">Período e busca</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo o período</option><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="year">Este ano</option><option value="custom">Escolher período</option></Select>
          <Input label="Buscar" placeholder="venda, cliente, produto ou fornecedor" list="report-suppliers" value={search} onChange={(event) => setSearch(event.target.value)} />
          <datalist id="report-suppliers">{suppliers.map((supplier) => <option key={supplier} value={supplier} />)}</datalist>
          <Select label="Espécie" value={species} onChange={(event) => setSpecies(event.target.value)}><option value="">Todas as espécies</option>{Object.entries(speciesLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input label="De" type="date" disabled={period !== "custom"} value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="Até" type="date" disabled={period !== "custom"} value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </Card>

      <section className="erp-metrics erp-metrics--five grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[["Vendas", sales.length.toLocaleString("pt-BR")], ["Faturamento", money(revenue)], ["Custo", money(cost)], ["Lucro bruto", money(profit)], ["Ticket médio", money(ticket)]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-sm text-subdued">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}
      </section>

      <Card className="erp-table-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3"><TrendingUp size={18} className="text-brand-700" /><h2 className="font-semibold">Vendas por meio de pagamento</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Meio de pagamento</th><th className="px-4 py-3">Vendas</th><th className="px-4 py-3">Total</th></tr></thead><tbody className="divide-y divide-border">{byPayment.map((row) => <tr key={row.name}><td className="px-4 py-3"><Badge>{row.name}</Badge></td><td className="px-4 py-3">{row.sales}</td><td className="px-4 py-3 font-semibold">{money(row.revenue)}</td></tr>)}{!byPayment.length ? <tr><td colSpan={3} className="px-4 py-8 text-center text-subdued">Nenhuma venda encontrada.</td></tr> : null}</tbody></table></div>
      </Card>

      <AnalyticTable title="Vendas por espécie (ordenado por quantidade)" rows={bySpecies} />
      <AnalyticTable title="Vendas por categoria e produto" rows={byCategory} />
      <AnalyticTable title="Produtos vendidos" rows={byProduct} />
      <AnalyticTable title="Lucratividade por fornecedor" rows={bySupplier} />
      <Card className="erp-table-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3"><TrendingUp size={18} className="text-brand-700" /><h2 className="font-semibold">Horários de pico</h2></div>
        <div className="erp-table-scroll overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Vendas</th><th className="px-4 py-3">Faturamento</th><th className="px-4 py-3">Ticket médio</th></tr></thead><tbody className="divide-y divide-border">{byHour.map((row) => <tr key={row.name}><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.sales}</td><td className="px-4 py-3">{money(row.revenue)}</td><td className="px-4 py-3">{money(row.revenue / row.sales)}</td></tr>)}{!byHour.length ? <tr><td colSpan={4} className="px-4 py-8 text-center text-subdued">Nenhuma venda encontrada.</td></tr> : null}</tbody></table></div>
      </Card>
      <p className="text-xs text-subdued">Lucro gerencial calculado pelo custo registrado no momento da venda. Descontos e acréscimos são rateados proporcionalmente entre os itens. Não substitui documentos fiscais nem a apuração contábil.</p>
    </div>
  );
}
