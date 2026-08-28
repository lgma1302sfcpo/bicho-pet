"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileDown, LoaderCircle, Minus, Plus, ReceiptText, RefreshCw, Save, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import type { CreateSaleDTO, SaleCreatedDTO } from "@/dtos/commerce/sale.dto";
import { useProducts } from "@/hooks/catalog/use-products";
import { useCreateSale, useCustomers, useSales } from "@/hooks/commerce/use-commerce";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";
import { parseBrazilianNumber } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

const unitLabels: Record<string, string> = { UN: "unidades", KG: "quilogramas", G: "gramas", L: "litros", ML: "mililitros", CX: "caixas", PC: "pacotes" };

type SaleFormValues = Omit<CreateSaleDTO, "soldAt"> & { soldAt?: Date | string };

function currentLocalDateTime() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function SaleCreatePage() {
  const customersQuery = useCustomers({ includeNeverPurchased: true, contactableOnly: false });
  const productsQuery = useProducts({ status: "ACTIVE", lowStockOnly: false });
  const salesQuery = useSales();
  const createSale = useCreateSale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerListItemDTO | null>(null);
  const [productSearches, setProductSearches] = useState<Record<string, string>>({});
  const [debouncedProductSearches, setDebouncedProductSearches] = useState<Record<string, string>>({});
  const [lastReceipt, setLastReceipt] = useState<{ sale: SaleCreatedDTO; values: CreateSaleDTO; customerName: string } | null>(null);
  const form = useForm<SaleFormValues, unknown, CreateSaleDTO>({
    resolver: zodResolver(createSaleSchema) as Resolver<SaleFormValues, unknown, CreateSaleDTO>,
    defaultValues: {
      customerId: "",
      soldAt: currentLocalDateTime(),
      discount: 0,
      surcharge: 0,
      notes: "",
      items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }]
    }
  });
  const items = useFieldArray({
    control: form.control,
    name: "items"
  });
  const customers = useMemo(() => {
    const queriedCustomers = customersQuery.data?.customers ?? [];
    if (!newCustomer || queriedCustomers.some((customer) => customer.id === newCustomer.id)) return queriedCustomers;
    return [newCustomer, ...queriedCustomers];
  }, [customersQuery.data?.customers, newCustomer]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearches(productSearches), 350);
    return () => window.clearTimeout(timer);
  }, [productSearches]);

  const watchedItems = form.watch("items");
  const discount = Number(parseBrazilianNumber(form.watch("discount")) ?? 0);
  const surcharge = Number(parseBrazilianNumber(form.watch("surcharge")) ?? 0);

  const subtotal = useMemo(
    () =>
      Math.round(
        watchedItems.reduce((total, item) => total + Number(parseBrazilianNumber(item.quantity) ?? 0) * Number(parseBrazilianNumber(item.unitPrice) ?? 0), 0) * 100
      ) / 100,
    [watchedItems]
  );
  const total = Math.round((subtotal - discount + surcharge) * 100) / 100;

  async function onSubmit(values: CreateSaleDTO) {
    setError(null);
    setSuccess(null);

    try {
      const sale = await createSale.mutateAsync({
        ...values,
        customerId: values.customerId || undefined
      });
      const customerName = customers.find((customer) => customer.id === values.customerId)?.name ?? "Consumidor final";
      setLastReceipt({ sale, values, customerName });
      setSuccess(`Venda ${sale.code} cadastrada com total de ${formatCurrency(sale.total)}.`);
      form.reset({
        customerId: "",
        soldAt: currentLocalDateTime(),
        discount: 0,
        surcharge: 0,
        notes: "",
        items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }]
      });
      setProductSearches({});
      setDebouncedProductSearches({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar a venda.");
    }
  }

  async function downloadReceipt() {
    if (!lastReceipt) return;
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF({ unit: "mm", format: "a4" });
    document.setFontSize(16);
    document.text("RECIBO NÃO FISCAL", 20, 20);
    document.setFontSize(10);
    document.text(`Venda: ${lastReceipt.sale.code}`, 20, 30);
    document.text(`Cliente: ${lastReceipt.customerName}`, 20, 36);
    document.text(`Data: ${new Date().toLocaleString("pt-BR")}`, 20, 42);
    document.text(`Pagamento: ${lastReceipt.values.paymentMethod}`, 20, 48);
    let y = 60;
    for (const item of lastReceipt.values.items) {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      document.text(`${item.description} - ${item.quantity} x ${formatCurrency(Number(item.unitPrice))}`, 20, y);
      document.text(formatCurrency(lineTotal), 170, y, { align: "right" });
      y += 7;
    }
    document.line(20, y, 190, y);
    document.setFontSize(12);
    document.text(`TOTAL: ${formatCurrency(lastReceipt.sale.total)}`, 190, y + 10, { align: "right" });
    document.setFontSize(9);
    document.text("Documento gerencial. Não substitui NFC-e, NF-e ou NFS-e.", 20, y + 22);
    document.save(`recibo-${lastReceipt.sale.code}.pdf`);
  }

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cadastrar venda</h1>
          <p className="text-sm text-subdued">Venda simples para alimentar o histórico e os filtros de clientes.</p>
        </div>
      </div>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4">
          <form className="space-y-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Select label="Cliente" error={form.formState.errors.customerId?.message} {...form.register("customerId")}>
                  <option value="">Consumidor final</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" className="w-full" onClick={() => setCreatingCustomer(true)}>
                  <UserPlus size={17} /> Cadastrar cliente
                </Button>
              </div>
              <Select
                label="Pagamento"
                required
                error={form.formState.errors.paymentMethod?.message}
                {...form.register("paymentMethod")}
              >
                <option value="">Selecione o pagamento</option>
                <option value="CASH">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="DEBIT_CARD">Cartão de débito</option>
                <option value="STORE_CREDIT">Crédito da loja</option>
                <option value="VOUCHER">Vale</option>
                <option value="MIXED">Múltiplo</option>
              </Select>
              <Input label="Data" type="datetime-local" {...form.register("soldAt")} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Itens</h2>
                <Button
                  variant="secondary"
                  onClick={() => items.append({ productId: "", description: "", quantity: 1, unitPrice: 0 })}
                >
                  <Plus size={18} />
                  Item
                </Button>
              </div>
              {items.fields.map((field, index) => {
                const search = normalizeSearch(debouncedProductSearches[field.id] ?? "");
                const selectedProductId = watchedItems[index]?.productId;
                const selectedProduct = (productsQuery.data?.products ?? []).find((product) => product.id === selectedProductId);
                const matchingProducts = search ? (productsQuery.data?.products ?? []).filter((product) => {
                  const identifiers = [product.name, product.code, product.sku, product.barcode].filter(Boolean).join(" ");
                  return normalizeSearch(identifiers).includes(search);
                }).slice(0, 10) : [];
                return (
                <div key={field.id} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1.2fr_1fr_100px_130px_44px]">
                  <div className="space-y-2">
                    <input type="hidden" {...form.register(`items.${index}.productId`)} />
                    <Input
                      label="Buscar produto"
                      placeholder="Digite nome, código, SKU ou código de barras"
                      value={productSearches[field.id] ?? ""}
                      onChange={(event) => setProductSearches((current) => ({ ...current, [field.id]: event.target.value }))}
                    />
                    {selectedProduct ? <div className="flex items-center justify-between gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs"><span><strong className="block text-brand-800">Selecionado: {selectedProduct.name}</strong><span className="text-brand-700">{selectedProduct.code ? `Código ${selectedProduct.code} · ` : ""}estoque {selectedProduct.stockQuantity} {unitLabels[selectedProduct.unit] ?? selectedProduct.unit}</span></span><Button className="h-8 shrink-0 px-2" variant="ghost" onClick={() => form.setValue(`items.${index}.productId`, "")}>Limpar</Button></div> : null}
                    {search ? <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-sm">
                      {matchingProducts.map((product) => <button
                        key={product.id}
                        type="button"
                        className="block w-full border-b border-border px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
                        onClick={() => {
                          form.setValue(`items.${index}.productId`, product.id, { shouldValidate: true });
                          form.setValue(`items.${index}.description`, product.name, { shouldValidate: true });
                          form.setValue(`items.${index}.unitPrice`, product.salePrice, { shouldValidate: true });
                          setProductSearches((current) => ({ ...current, [field.id]: "" }));
                          setDebouncedProductSearches((current) => ({ ...current, [field.id]: "" }));
                        }}
                      ><strong className="block">{product.code ? `${product.code} · ` : ""}{product.name}</strong><span className="text-xs text-subdued">Estoque {product.stockQuantity} {unitLabels[product.unit] ?? product.unit}{product.sku ? ` · SKU ${product.sku}` : ""}</span></button>)}
                      {!matchingProducts.length ? <p className="px-3 py-4 text-center text-sm text-subdued">Nenhum produto encontrado. Preencha a descrição para usar um item avulso.</p> : null}
                    </div> : <p className="text-xs text-subdued">Digite normalmente; os resultados aparecerão abaixo.</p>}
                  </div>
                  <Input
                    label="Descrição"
                    error={form.formState.errors.items?.[index]?.description?.message}
                    {...form.register(`items.${index}.description`)}
                  />
                  <Input
                    label="Quantidade"
                    mask="decimal"
                    error={form.formState.errors.items?.[index]?.quantity?.message}
                    {...form.register(`items.${index}.quantity`)}
                  />
                  <Input
                    label="Preço unitário"
                    help="Valor cobrado por uma unidade deste item."
                    mask="currency"
                    error={form.formState.errors.items?.[index]?.unitPrice?.message}
                    {...form.register(`items.${index}.unitPrice`)}
                  />
                  <Button
                    className="sale-item-remove mt-6 h-10 px-0"
                    variant="ghost"
                    title="Remover item"
                    onClick={() => items.fields.length > 1 && items.remove(index)}
                  >
                    <Minus size={18} />
                  </Button>
                </div>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Desconto" mask="currency" {...form.register("discount")} />
              <Input label="Acréscimo" mask="currency" {...form.register("surcharge")} />
              <Input label="Observações" {...form.register("notes")} />
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success sm:flex-row sm:items-center sm:justify-between">
                <span>{success}</span>
                <Button variant="secondary" onClick={downloadReceipt}><FileDown size={16} /> Baixar recibo</Button>
              </div>
            ) : null}

            <Button type="submit" disabled={createSale.isPending}>
              <Save size={18} />
              Salvar venda
            </Button>
          </form>
        </Card>

        <div className="erp-side-stack space-y-5">
          <Card className="erp-side-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText size={18} className="text-brand-700" />
              <h2 className="font-semibold">Resumo</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-subdued">Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-subdued">Desconto</span>
                <strong>{formatCurrency(discount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-subdued">Acréscimo</span>
                <strong>{formatCurrency(surcharge)}</strong>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">Últimas vendas</h2>
            </div>
            <div className="divide-y divide-border">
              {salesQuery.isPending ? <div className="flex items-center justify-center gap-2 p-6 text-sm text-subdued" role="status"><LoaderCircle className="animate-spin text-brand-700" size={22} />Atualizando vendas...</div> : null}
              {salesQuery.isError ? <div className="space-y-3 p-4 text-sm"><p className="text-danger">{salesQuery.error.message}</p><Button type="button" variant="secondary" onClick={() => void salesQuery.refetch()}><RefreshCw size={16} />Tentar novamente</Button></div> : null}
              {(salesQuery.data ?? []).slice(0, 10).map((sale) => (
                <div key={sale.id} className="p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{sale.code}</p>
                      <p className="text-subdued">{sale.customerName ?? "Consumidor final"}</p>
                    </div>
                    <Badge>{formatCurrency(sale.total)}</Badge>
                  </div>
                </div>
              ))}
              {salesQuery.isSuccess && salesQuery.data.length === 0 ? (
                <div className="p-4 text-sm text-subdued">Nenhuma venda cadastrada.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
      <Modal
        open={creatingCustomer}
        title="Cadastrar cliente"
        description="Cadastre o cliente sem sair da venda. Ao salvar, ele será selecionado automaticamente."
        onClose={() => setCreatingCustomer(false)}
      >
        <CustomerCreateForm
          onCancel={() => setCreatingCustomer(false)}
          onSuccess={(customer) => {
            setNewCustomer(customer);
            form.setValue("customerId", customer.id, { shouldValidate: true });
            setCreatingCustomer(false);
          }}
        />
      </Modal>
    </div>
  );
}
