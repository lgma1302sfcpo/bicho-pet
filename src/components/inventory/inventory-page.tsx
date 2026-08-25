"use client";

import { ArrowDownToLine, ArrowUpFromLine, Boxes, Save, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateInventoryMovement, useInventory } from "@/hooks/use-operations";
import { parseBrazilianNumber } from "@/lib/utils";

const movementLabels = { ENTRY: "Entrada", EXIT: "Saida", ADJUSTMENT: "Ajuste de saldo" } as const;
const unitLabels: Record<string, string> = { UN: "unidades", KG: "quilogramas", G: "gramas", L: "litros", ML: "mililitros", CX: "caixas", PC: "pacotes" };
const reasons = ["Compra de fornecedor", "Venda de produto", "Devolucao de cliente", "Perda ou avaria", "Inventario fisico", "Uso interno", "Outro motivo"];

export function InventoryPage() {
  const inventory = useInventory();
  const createMovement = useCreateInventoryMovement();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<keyof typeof movementLabels>("ENTRY");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const products = useMemo(() => inventory.data?.products ?? [], [inventory.data?.products]);
  const filtered = useMemo(() => products.filter((product) => (!search || `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())) && (stockFilter === "ALL" || (stockFilter === "LOW" ? product.isLowStock : product.stockQuantity > 0))), [products, search, stockFilter]);
  const filtersActive = Boolean(search || stockFilter !== "ALL");

  async function submit() {
    setFeedback(null);
    try {
      await createMovement.mutateAsync({ productId, type, quantity, reason, reference });
      setQuantity(""); setReference(""); setFeedback("Movimentacao registrada e saldo atualizado.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Nao foi possivel movimentar o estoque."); }
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Estoque</h1><p className="text-sm text-subdued">Saldos atuais e historico completo de entradas, saidas e ajustes.</p></div>
    <section className="grid gap-3 sm:grid-cols-3">{[["Produtos ativos", products.length], ["Estoque baixo", products.filter((p) => p.isLowStock).length], ["Unidades em estoque", products.reduce((sum, p) => sum + p.stockQuantity, 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-sm text-subdued">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Card className="p-4"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-brand-700" /><h2 className="font-semibold">Localizar produtos</h2></div>{filtersActive ? <Badge className="border-brand-200 bg-brand-50 text-brand-700">Filtro aplicado: {filtered.length} resultado(s)</Badge> : <Badge>Todos os produtos</Badge>}</div><div className="grid gap-3 sm:grid-cols-2"><Input label="Buscar produto" placeholder="Nome ou categoria" value={search} onChange={(event) => setSearch(event.target.value)} /><Select label="Situacao do estoque" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="ALL">Todos</option><option value="LOW">Somente estoque baixo</option><option value="AVAILABLE">Somente com saldo</option></Select></div></Card>
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Saldo atual</th><th className="px-4 py-3">Estoque minimo</th><th className="px-4 py-3">Situacao</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((product) => <tr key={product.id}><td className="px-4 py-3 font-medium">{product.name}</td><td className="px-4 py-3">{product.category}</td><td className="px-4 py-3 font-semibold">{product.stockQuantity.toLocaleString("pt-BR")} {unitLabels[product.unit] ?? product.unit}</td><td className="px-4 py-3">{product.minStock.toLocaleString("pt-BR")} {unitLabels[product.unit] ?? product.unit}</td><td className="px-4 py-3">{product.isLowStock ? <Badge className="border-amber-200 bg-amber-50 text-warning">Reposicao necessaria</Badge> : <Badge className="border-emerald-200 bg-emerald-50 text-success">Saldo adequado</Badge>}</td></tr>)}</tbody></table></div></Card>
        <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Historico de movimentacoes</h2></div><div className="divide-y divide-border">{(inventory.data?.movements ?? []).slice(0, 20).map((movement) => <div key={movement.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3">{movement.type === "ENTRY" ? <ArrowDownToLine className="text-success" /> : <ArrowUpFromLine className="text-warning" />}<div><p className="font-semibold">{movement.productName}</p><p className="text-subdued">{movementLabels[movement.type]} · {movement.reason} · {new Date(movement.createdAt).toLocaleString("pt-BR")}</p></div></div><div className="text-right"><p className="font-semibold">{movement.previousBalance} → {movement.newBalance} {unitLabels[movement.unit] ?? movement.unit}</p><p className="text-xs text-subdued">Responsavel: {movement.userName}</p></div></div>)}</div></Card>
      </div>
      <Card className="h-fit p-4"><div className="mb-4 flex items-center gap-2"><Boxes size={19} className="text-brand-700" /><h2 className="font-semibold">Nova movimentacao</h2></div><div className="space-y-3"><Select label="Produto" help="Escolha o produto cujo saldo sera atualizado." value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — saldo {product.stockQuantity} {unitLabels[product.unit] ?? product.unit}</option>)}</Select><Select label="Tipo de movimentacao" help="Entrada soma ao saldo, saida reduz e ajuste substitui o saldo atual." value={type} onChange={(event) => setType(event.target.value as keyof typeof movementLabels)}>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Input label={type === "ADJUSTMENT" ? "Novo saldo" : "Quantidade"} help={type === "ADJUSTMENT" ? "Informe o saldo contado fisicamente." : "Informe quanto entrara ou saira do estoque."} mask="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /><Select label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)}>{reasons.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Documento de referencia" help="Numero da nota, pedido ou documento relacionado. Campo opcional." placeholder="Exemplo: nota 1548" value={reference} onChange={(event) => setReference(event.target.value)} />{feedback ? <p className="rounded-md bg-muted p-3 text-sm">{feedback}</p> : null}<Button className="w-full" disabled={createMovement.isPending || !productId || !quantity || Number(parseBrazilianNumber(quantity)) < 0} onClick={submit}><Save size={17} />Registrar movimentacao</Button></div></Card>
    </section>
  </div>;
}
