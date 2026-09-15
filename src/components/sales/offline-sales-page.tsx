"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Save, WifiOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CreateSaleDTO, SaleCreatedDTO } from "@/dtos/commerce/sale.dto";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";
import { getCatalog, getPendingSales, removePendingSale, saveCatalog, savePendingSale, type OfflineProduct, type PendingOfflineSale } from "@/lib/offline-sales";

type Props = { tenantId: string; branchId: string; branchName: string; userId: string };
type Line = { productId: string; quantity: number };
const paymentLabels = { CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito" } as const;
type Payment = keyof typeof paymentLabels;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function OfflineSalesPage({ tenantId, branchId, branchName, userId }: Props) {
  const scope = `${tenantId}:${branchId}:${userId}`;
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [catalogAt, setCatalogAt] = useState<string | null>(null);
  const [cashRegisterSessionId, setCashRegisterSessionId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingOfflineSale[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState<Payment>("CASH");
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [message, setMessage] = useState("");
  const syncLock = useRef(false);
  const total = lines.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.salePrice ?? 0) * line.quantity, 0);

  const reloadPending = useCallback(async () => setPending(await getPendingSales(scope)), [scope]);
  const refreshCatalog = useCallback(async () => {
    if (!branchId || !navigator.onLine) return;
    setLoading(true);
    try {
      const response = await fetch("/api/sales/offline-catalog", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível atualizar os produtos.");
      const body = await response.json() as { data?: { products?: OfflineProduct[]; cashRegisterSessionId?: string | null } };
      const active = body.data?.products ?? [];
      const cashId = body.data?.cashRegisterSessionId ?? null;
      const updatedAt = new Date().toISOString();
      await saveCatalog({ scope, updatedAt, cashRegisterSessionId: cashId, products: active });
      setProducts(active);
      setCatalogAt(updatedAt);
      setCashRegisterSessionId(cashId);
      setMessage(cashId ? `Produtos disponíveis offline: ${active.length}. Caixa preparado para esta loja.` : "Produtos atualizados. Abra o caixa antes de registrar vendas offline.");
    } catch {
      setMessage("Não foi possível atualizar os produtos. A cópia anterior continua disponível.");
    } finally { setLoading(false); }
  }, [branchId, scope]);

  const synchronize = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    setSyncing(true);
    try {
      const sales = await getPendingSales(scope);
      for (const sale of sales) {
        try {
          const response = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sale.payload) });
          const body = await response.json() as { data?: SaleCreatedDTO; error?: { message?: string } };
          if (!response.ok || !body.data) throw new Error(body.error?.message ?? "O servidor não confirmou a venda.");
          await removePendingSale(sale.id);
          setMessage(`Venda ${body.data.code} sincronizada. ${body.data.fiscal?.message ?? "Confira a situação fiscal no ERP."}`);
        } catch (error) {
          const detail = error instanceof Error ? error.message : "Falha na sincronização.";
          await savePendingSale({ ...sale, status: "ERROR", error: detail });
          if (!navigator.onLine || detail === "Failed to fetch") break;
        }
      }
      await reloadPending();
    } finally { syncLock.current = false; setSyncing(false); }
  }, [scope, reloadPending]);

  useEffect(() => {
    let active = true;
    let prepareOffline: (() => void) | null = null;
    setOnline(navigator.onLine);
    void getCatalog(scope).then((catalog) => {
      if (active && catalog) { setProducts(catalog.products); setCatalogAt(catalog.updatedAt); setCashRegisterSessionId(catalog.cashRegisterSessionId ?? null); }
    }).finally(() => { if (active) void refreshCatalog(); });
    void reloadPending();
    if (navigator.onLine) void synchronize();
    if (navigator.onLine && "serviceWorker" in navigator) {
      prepareOffline = () => {
        const resources = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]"))
          .map((element) => element instanceof HTMLScriptElement ? element.src : element.href)
          .filter((url) => url.startsWith(`${window.location.origin}/_next/static/`))
          .map((url) => new URL(url).pathname);
        void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "PREPARE_OFFLINE_SALES", resources }));
      };
      prepareOffline();
      navigator.serviceWorker.addEventListener("controllerchange", prepareOffline, { once: true });
    }
    const onOnline = () => { setOnline(true); void refreshCatalog(); void synchronize(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const retryTimer = window.setInterval(() => { if (navigator.onLine) void synchronize(); }, 30_000);
    return () => { active = false; window.clearInterval(retryTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); if (prepareOffline && "serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", prepareOffline); };
  }, [scope, reloadPending, refreshCatalog, synchronize]);

  async function saveSale() {
    setMessage("");
    if (!catalogAt || !lines.length) { setMessage("Atualize os produtos e inclua pelo menos um item."); return; }
    if (!cashRegisterSessionId) { setMessage("Abra o caixa enquanto houver conexão e prepare novamente esta tela antes de vender offline."); return; }
    if (payment !== "CASH" && !paymentRecorded) { setMessage("Confirme no terminal ou aplicativo que o pagamento foi recebido antes de registrar a venda."); return; }
    const offlineId = crypto.randomUUID();
    const payload: CreateSaleDTO = {
      offlineId, offlineCashRegisterSessionId: cashRegisterSessionId, paymentMethod: payment, customerId: "", discount: 0, surcharge: 0,
      soldAt: new Date(), notes: `Venda registrada offline no aparelho. Pagamento ${paymentLabels[payment]} informado pelo operador.`,
      items: lines.map((line) => {
        const product = products.find((item) => item.id === line.productId)!;
        return { productId: product.id, description: product.name, quantity: line.quantity, unitPrice: product.salePrice, discount: 0 };
      })
    };
    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Revise os itens da venda."); return; }
    try {
      await savePendingSale({ id: offlineId, scope, createdAt: new Date().toISOString(), total: Math.round(total * 100) / 100, payload: parsed.data, status: "PENDING" });
      await reloadPending();
      setLines([]); setPayment("CASH"); setPaymentRecorded(false);
      setMessage(`Venda salva neste computador como pendente (${offlineId.slice(0, 8)}). Ainda não entrou no caixa, estoque ou fiscal da produção.`);
      if (navigator.onLine) void synchronize();
    } catch { setMessage("Não foi possível guardar a venda neste computador. Não entregue a venda como registrada."); }
  }

  const matches = products.filter((product) => `${product.name} ${product.code ?? ""} ${product.sku ?? ""} ${product.barcode ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).slice(0, 40);
  return <div className="erp-page space-y-5">
    <div className="erp-page-header"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><WifiOff size={24} /> Vendas offline</h1><p className="text-sm text-subdued">Loja: {branchName}. As vendas deste computador aguardam envio à produção.</p></div><Link className="text-sm font-semibold text-brand-700 underline" href="/vendas/nova">Venda normal</Link></div>
    <Card className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{online ? "Rede detectada" : "Sem conexão"}</strong><p className="text-sm text-subdued">Produtos atualizados: {catalogAt ? new Date(catalogAt).toLocaleString("pt-BR") : "ainda não preparados"} · Caixa original: {cashRegisterSessionId ? cashRegisterSessionId.slice(0, 8) : "não preparado"}</p></div><div className="flex gap-2"><Button variant="secondary" disabled={loading || !online} onClick={() => void refreshCatalog()}><RefreshCw size={16} /> Atualizar produtos</Button><Button disabled={syncing || !online || !pending.length} onClick={() => void synchronize()}><RefreshCw size={16} /> {syncing ? "Sincronizando..." : "Sincronizar agora"}</Button></div></div><p className="text-xs text-subdued">Prepare esta tela com o caixa aberto enquanto houver internet. Não limpe os dados do navegador enquanto houver vendas pendentes.</p></Card>
    {!branchId ? <p className="rounded-md bg-red-50 p-3 text-sm text-danger">Selecione uma loja antes de usar vendas offline.</p> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><Card className="space-y-4 p-4"><h2 className="font-semibold">Nova venda pendente</h2><input className="h-10 w-full rounded-md border border-border px-3" placeholder="Buscar produto, código ou código de barras" value={search} onChange={(event) => setSearch(event.target.value)} disabled={!catalogAt} />
      {search ? <div className="max-h-56 overflow-auto rounded-md border border-border">{matches.map((product) => <button type="button" key={product.id} className="flex w-full justify-between border-b px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => { setLines((current) => { const existing = current.find((line) => line.productId === product.id); return existing ? current.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { productId: product.id, quantity: 1 }]; }); setSearch(""); }}><span>{product.name} · estoque visto {product.stockQuantity}</span><strong>{money(product.salePrice)}</strong></button>)}{!matches.length ? <p className="p-3 text-sm text-subdued">Nenhum produto encontrado.</p> : null}</div> : null}
      {lines.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product) return null; return <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm" key={line.productId}><span>{product.name} · {money(product.salePrice)}</span><div className="flex items-center gap-2"><input className="h-9 w-20 rounded-md border border-border px-2" type="number" min="0.001" step={product.unit === "KG" ? "0.001" : "1"} value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.productId === line.productId ? { ...item, quantity: Number(event.target.value) } : item))} /><strong>{money(product.salePrice * line.quantity)}</strong><Button variant="ghost" onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))}>Remover</Button></div></div>; })}
      <div className="flex justify-between font-semibold"><span>Total</span><span>{money(total)}</span></div><label className="block text-sm font-medium">Pagamento<select className="mt-1 h-10 w-full rounded-md border border-border px-3" value={payment} onChange={(event) => { setPayment(event.target.value as Payment); setPaymentRecorded(false); }}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {payment !== "CASH" ? <label className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><input type="checkbox" checked={paymentRecorded} onChange={(event) => setPaymentRecorded(event.target.checked)} />Confirmo que recebi o Pix ou que o cartão foi aprovado no terminal. O ERP não verifica isso sem internet.</label> : null}
      <Button disabled={!branchId || !catalogAt || !cashRegisterSessionId || !lines.length || lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)} onClick={() => void saveSale()}><Save size={16} /> Salvar como pendente</Button></Card>
      <Card className="p-4"><h2 className="font-semibold">Pendentes neste computador ({pending.length})</h2><div className="mt-3 space-y-3">{pending.map((sale) => <div className="rounded-md border border-border p-3 text-sm" key={sale.id}><div className="flex justify-between gap-2"><strong>{sale.id.slice(0, 8)} · {money(sale.total)}</strong><span className={sale.status === "ERROR" ? "text-danger" : "text-amber-700"}>{sale.status === "ERROR" ? "Erro" : "Pendente"}</span></div><p className="text-subdued">{new Date(sale.createdAt).toLocaleString("pt-BR")} · Caixa {sale.payload.offlineCashRegisterSessionId?.slice(0, 8) ?? "não identificado"} · {paymentLabels[sale.payload.paymentMethod as Payment] ?? sale.payload.paymentMethod}</p>{sale.error ? <p className="mt-1 text-danger">{sale.error}</p> : null}</div>)}{!pending.length ? <p className="text-sm text-subdued">Nenhuma venda aguardando sincronização.</p> : null}</div></Card></div>
    {message ? <p className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm">{message}</p> : null}
    <p className="text-xs text-subdued">O saldo mostrado é a última cópia recebida. A venda só atualiza caixa, estoque e situação fiscal após a confirmação do servidor. Este registro local não é documento fiscal.</p>
  </div>;
}
