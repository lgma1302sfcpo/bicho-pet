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
import type { ProductListItemDTO } from "@/dtos/catalog/product.dto";
import type { CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import type { CreateSaleDTO, SaleCreatedDTO } from "@/dtos/commerce/sale.dto";
import { useProductSearches } from "@/hooks/catalog/use-products";
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
const paymentOptions = [
  ["CASH", "Dinheiro"], ["PIX", "PIX"], ["CREDIT_CARD", "Cartão de crédito"],
  ["DEBIT_CARD", "Cartão de débito"], ["STORE_CREDIT", "Fiado"], ["VOUCHER", "Vale"]
] as const;

type SaleFormValues = Omit<CreateSaleDTO, "soldAt"> & { soldAt?: Date | string };

function currentLocalDateTime() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function isBulkWeightProduct(product?: ProductListItemDTO) {
  return Boolean(product && (product.unit === "KG" || normalizeSearch(product.category).includes("granel")));
}

export function SaleCreatePage({ branchName = "Loja selecionada" }: { branchName?: string }) {
  const customersQuery = useCustomers({ includeNeverPurchased: true, contactableOnly: false });
  const salesQuery = useSales();
  const createSale = useCreateSale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPopupWindow, setIsPopupWindow] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerListItemDTO | null>(null);
  const [productSearches, setProductSearches] = useState<Record<string, string>>({});
  const [debouncedProductSearches, setDebouncedProductSearches] = useState<Record<string, string>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductListItemDTO>>({});
  const [activeBulkItemId, setActiveBulkItemId] = useState<string | null>(null);
  const [priceCalculatorItemId, setPriceCalculatorItemId] = useState<string | null>(null);
  const [desiredSaleValue, setDesiredSaleValue] = useState("");
  const [priceCalculatorError, setPriceCalculatorError] = useState<string | null>(null);
  const [bulkAmountOverrides, setBulkAmountOverrides] = useState<Record<string, { productId: string; quantityKg: number; amount: number }>>({});
  const [lastReceipt, setLastReceipt] = useState<{
    sale: SaleCreatedDTO;
    values: CreateSaleDTO;
    customerName: string;
    productsById: Record<string, ProductListItemDTO>;
  } | null>(null);
  const form = useForm<SaleFormValues, unknown, CreateSaleDTO>({
    resolver: zodResolver(createSaleSchema) as Resolver<SaleFormValues, unknown, CreateSaleDTO>,
    defaultValues: {
      customerId: "",
      soldAt: currentLocalDateTime(),
      discount: 0,
      surcharge: 0,
      notes: "",
      payments: [],
      items: [{ productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }]
    }
  });
  const items = useFieldArray({
    control: form.control,
    name: "items"
  });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, replace: replacePayments } = useFieldArray({ control: form.control, name: "payments" });
  const selectedPaymentMethod = form.watch("paymentMethod");
  const watchedPayments = form.watch("payments") ?? [];
  const customers = useMemo(() => {
    const queriedCustomers = customersQuery.data?.customers ?? [];
    if (!newCustomer || queriedCustomers.some((customer) => customer.id === newCustomer.id)) return queriedCustomers;
    return [newCustomer, ...queriedCustomers];
  }, [customersQuery.data?.customers, newCustomer]);

  useEffect(() => {
    setIsPopupWindow(Boolean(window.opener && !window.opener.closed));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearches(productSearches), 350);
    return () => window.clearTimeout(timer);
  }, [productSearches]);

  const productSearchQueries = useProductSearches(
    items.fields.map((field) => debouncedProductSearches[field.id] ?? "")
  );

  const watchedItems = form.watch("items");
  const knownProducts = useMemo(() => {
    const productsById = new Map<string, ProductListItemDTO>();
    Object.values(selectedProducts).forEach((product) => productsById.set(product.id, product));
    return productsById;
  }, [selectedProducts]);
  const surcharge = Number(parseBrazilianNumber(form.watch("surcharge")) ?? 0);
  const priceCalculatorIndex = priceCalculatorItemId
    ? items.fields.findIndex((field) => field.id === priceCalculatorItemId)
    : -1;
  const priceCalculatorProduct = priceCalculatorItemId ? selectedProducts[priceCalculatorItemId] : undefined;
  const pricePerKilogram = priceCalculatorProduct?.salePrice ?? 0;
  const desiredAmount = Number(parseBrazilianNumber(desiredSaleValue) ?? 0);
  const calculatedWeightKg = desiredAmount > 0 && pricePerKilogram > 0
    ? Math.round((desiredAmount / pricePerKilogram) * 1000) / 1000
    : 0;

  useEffect(() => {
    function handlePriceShortcut(event: KeyboardEvent) {
      if (!event.altKey || event.key.toLocaleLowerCase("pt-BR") !== "p") return;
      event.preventDefault();

      const bulkItemIds = items.fields
        .filter((field) => isBulkWeightProduct(selectedProducts[field.id]))
        .map((field) => field.id);
      const targetItemId = activeBulkItemId && bulkItemIds.includes(activeBulkItemId)
        ? activeBulkItemId
        : bulkItemIds[0];

      if (!targetItemId) {
        setError("Selecione um produto a granel antes de usar o atalho Alt + P.");
        return;
      }

      setError(null);
      setActiveBulkItemId(targetItemId);
      setPriceCalculatorItemId(targetItemId);
      setDesiredSaleValue("");
      setPriceCalculatorError(null);
    }

    window.addEventListener("keydown", handlePriceShortcut);
    return () => window.removeEventListener("keydown", handlePriceShortcut);
  }, [activeBulkItemId, items.fields, selectedProducts]);

  const rawSubtotal = watchedItems.reduce((runningTotal, item) => {
      const product = item.productId ? knownProducts.get(item.productId) : undefined;
      const enteredQuantity = Number(parseBrazilianNumber(item.quantity) ?? 0);
      const saleQuantity = enteredQuantity;
      const unitPrice = isBulkWeightProduct(product)
        ? product?.salePrice ?? 0
        : Number(parseBrazilianNumber(item.unitPrice) ?? 0);
      return runningTotal + saleQuantity * unitPrice;
    }, 0);
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const itemDiscountTotal = Math.round(watchedItems.reduce((total, item) => total + Number(parseBrazilianNumber(item.discount) ?? 0), 0) * 100) / 100;
  const bulkAdjustments = items.fields.reduce((result, field, index) => {
    const override = bulkAmountOverrides[field.id];
    const item = watchedItems[index];
    const product = item?.productId ? knownProducts.get(item.productId) : undefined;
    const quantityKg = Number(parseBrazilianNumber(item?.quantity) ?? 0);
    if (!override || !product || override.productId !== product.id || override.quantityKg !== quantityKg) return result;
    const calculatedAmount = Math.round(quantityKg * product.salePrice * 100) / 100;
    const difference = Math.round((calculatedAmount - override.amount) * 100) / 100;
    if (difference > 0) {
      result.discount += difference;
      result.discountByItem[field.id] = difference;
    } else if (difference < 0) {
      result.surcharge += Math.abs(difference);
    }
    return result;
  }, { discount: 0, surcharge: 0, discountByItem: {} as Record<string, number> });
  const bulkRoundingAdjustment = Math.round((bulkAdjustments.discount - bulkAdjustments.surcharge) * 100) / 100;
  const appliedDiscount = Math.round((itemDiscountTotal + bulkAdjustments.discount) * 100) / 100;
  const appliedSurcharge = Math.round((surcharge + bulkAdjustments.surcharge) * 100) / 100;
  const total = Math.round((subtotal - appliedDiscount + appliedSurcharge) * 100) / 100;
  const allocatedPaymentTotal = Math.round(watchedPayments.reduce((sum, payment) => sum + Number(parseBrazilianNumber(payment.amount) ?? 0), 0) * 100) / 100;

  useEffect(() => {
    if (selectedPaymentMethod === "MIXED" && paymentFields.length < 2) {
      replacePayments([{ method: "CASH", amount: 0 }, { method: "DEBIT_CARD", amount: 0 }]);
    }
  }, [selectedPaymentMethod, paymentFields.length, replacePayments]);

  function openPriceCalculator(itemId: string) {
    setActiveBulkItemId(itemId);
    setPriceCalculatorItemId(itemId);
    setDesiredSaleValue("");
    setPriceCalculatorError(null);
  }

  function applyPriceCalculation() {
    if (priceCalculatorIndex < 0 || !priceCalculatorProduct || !isBulkWeightProduct(priceCalculatorProduct)) {
      setPriceCalculatorError("Selecione novamente o produto a granel.");
      return;
    }
    if (desiredAmount <= 0) {
      setPriceCalculatorError("Informe o valor que o cliente deseja comprar.");
      return;
    }
    if (pricePerKilogram <= 0) {
      setPriceCalculatorError("O produto precisa ter um preço por kg maior que zero.");
      return;
    }

    form.setValue(
      `items.${priceCalculatorIndex}.quantity`,
      calculatedWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) as unknown as number,
      { shouldDirty: true, shouldValidate: true }
    );
    setBulkAmountOverrides((current) => ({
      ...current,
      [items.fields[priceCalculatorIndex].id]: {
        productId: priceCalculatorProduct.id,
        quantityKg: calculatedWeightKg,
        amount: Math.round(desiredAmount * 100) / 100
      }
    }));
    setPriceCalculatorItemId(null);
    setDesiredSaleValue("");
    setPriceCalculatorError(null);
  }

  async function onSubmit(values: CreateSaleDTO) {
    setError(null);
    setSuccess(null);

    try {
      const normalizedValues: CreateSaleDTO = {
        ...values,
        customerId: values.customerId || undefined,
        discount: appliedDiscount,
        surcharge: appliedSurcharge,
        items: values.items.map((item, index) => {
          const product = item.productId ? knownProducts.get(item.productId) : undefined;
          if (!isBulkWeightProduct(product)) return item;
          return {
            ...item,
            quantity: item.quantity,
            unitPrice: product?.salePrice ?? item.unitPrice,
            discount: Math.round((item.discount + (bulkAdjustments.discountByItem[items.fields[index]?.id] ?? 0)) * 100) / 100
          };
        })
      };
      const invalidDiscountItem = normalizedValues.items.find((item) => item.discount > Math.round(item.quantity * item.unitPrice * 100) / 100);
      if (invalidDiscountItem) {
        setError(`O desconto de ${invalidDiscountItem.description} não pode ser maior que o valor do item.`);
        return;
      }
      const sale = await createSale.mutateAsync({
        ...normalizedValues
      });
      const customerName = customers.find((customer) => customer.id === values.customerId)?.name ?? "Consumidor final";
      const productsById = Object.fromEntries(
        normalizedValues.items.flatMap((item) => {
          const product = item.productId ? knownProducts.get(item.productId) : undefined;
          return product ? [[product.id, product]] : [];
        })
      );
      setLastReceipt({ sale, values: normalizedValues, customerName, productsById });
      setSuccess(`Venda ${sale.code} cadastrada com total de ${formatCurrency(sale.total)}.`);
      form.reset({
        customerId: "",
        soldAt: currentLocalDateTime(),
        discount: 0,
        surcharge: 0,
        notes: "",
        payments: [],
        items: [{ productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }]
      });
      setProductSearches({});
      setDebouncedProductSearches({});
      setSelectedProducts({});
      setBulkAmountOverrides({});
      setActiveBulkItemId(null);
      setPriceCalculatorItemId(null);
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
    const receiptPayment = lastReceipt.values.paymentMethod === "MIXED"
      ? (lastReceipt.values.payments ?? []).map((payment) => `${payment.method}: ${formatCurrency(payment.amount)}`).join(" + ")
      : lastReceipt.values.paymentMethod;
    document.text(`Pagamento: ${receiptPayment}`, 20, 48);
    let y = 60;
    for (const item of lastReceipt.values.items) {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);
      const product = item.productId ? lastReceipt.productsById[item.productId] : undefined;
      const bulkWeightProduct = isBulkWeightProduct(product);
      const quantityLabel = bulkWeightProduct
        ? `${Number(item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`
        : String(item.quantity);
      const priceLabel = `${formatCurrency(Number(item.unitPrice))}${bulkWeightProduct ? "/kg" : ""}`;
      document.text(`${item.description} - ${quantityLabel} x ${priceLabel}`, 20, y);
      document.text(formatCurrency(lineTotal), 170, y, { align: "right" });
      y += 7;
      if (item.discount > 0) {
        document.text(`Desconto do item: ${formatCurrency(item.discount)}`, 26, y);
        y += 6;
      }
    }
    document.line(20, y, 190, y);
    document.setFontSize(12);
    document.text(`TOTAL: ${formatCurrency(lastReceipt.sale.total)}`, 190, y + 10, { align: "right" });
    document.setFontSize(9);
    document.text("Documento gerencial. Não substitui NFC-e, NF-e ou NFS-e.", 20, y + 22);
    document.save(`recibo-${lastReceipt.sale.code}.pdf`);
  }

  return (
    <div className="erp-page sale-page">
      <div className="erp-page-header">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cadastrar venda</h1>
          <p className="text-sm text-subdued">Venda simples para alimentar o histórico e os filtros de clientes.</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-900"><span className="block text-xs font-medium uppercase tracking-wide text-brand-700">Venda sendo lançada na loja</span><strong>{branchName}</strong></div>
      </div>

      <section className="sale-layout grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="sale-form-card p-4 sm:p-5">
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
                <option value="STORE_CREDIT">Fiado</option>
                <option value="VOUCHER">Vale</option>
                <option value="MIXED">Múltiplo</option>
              </Select>
              <Input label="Data" type="datetime-local" {...form.register("soldAt")} />
            </div>

            {selectedPaymentMethod === "MIXED" ? (
              <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="font-semibold">Divisão do pagamento</h2><p className="text-sm text-subdued">Informe quanto foi pago em cada forma.</p></div>
                  <Button type="button" variant="secondary" onClick={() => appendPayment({ method: "PIX", amount: 0 })}><Plus size={16}/>Forma</Button>
                </div>
                {paymentFields.map((payment, index) => (
                  <div key={payment.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Select label={`Forma ${index + 1}`} error={form.formState.errors.payments?.[index]?.method?.message} {...form.register(`payments.${index}.method`)}>
                      {paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select>
                    <Input label="Valor" mask="currency" error={form.formState.errors.payments?.[index]?.amount?.message} {...form.register(`payments.${index}.amount`)} />
                    <Button type="button" variant="danger" aria-label={`Remover forma ${index + 1}`} disabled={paymentFields.length <= 2} onClick={() => removePayment(index)}><Minus size={17}/></Button>
                  </div>
                ))}
                {form.formState.errors.payments?.message ? <p className="text-sm font-medium text-danger">{form.formState.errors.payments.message}</p> : null}
                <div className="flex justify-between rounded-md bg-white p-3 text-sm"><span>Total distribuído</span><strong className={allocatedPaymentTotal === total ? "text-success" : "text-danger"}>{formatCurrency(allocatedPaymentTotal)} de {formatCurrency(total)}</strong></div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Itens</h2>
                <Button
                  variant="secondary"
                  onClick={() => items.append({ productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0 })}
                >
                  <Plus size={18} />
                  Item
                </Button>
              </div>
              {items.fields.map((field, index) => {
                const rawSearch = productSearches[field.id]?.trim() ?? "";
                const search = debouncedProductSearches[field.id]?.trim() ?? "";
                const productSearchQuery = productSearchQueries[index];
                const selectedProductId = watchedItems[index]?.productId;
                const selectedProduct = selectedProducts[field.id]
                  ?? (selectedProductId ? knownProducts.get(selectedProductId) : undefined);
                const bulkWeightProduct = isBulkWeightProduct(selectedProduct);
                const enteredWeight = Number(parseBrazilianNumber(watchedItems[index]?.quantity) ?? 0);
                const enteredUnitPrice = bulkWeightProduct
                  ? selectedProduct?.salePrice ?? 0
                  : Number(parseBrazilianNumber(watchedItems[index]?.unitPrice) ?? 0);
                const enteredItemDiscount = Number(parseBrazilianNumber(watchedItems[index]?.discount) ?? 0);
                const bulkAmountOverride = bulkAmountOverrides[field.id];
                const validBulkAmountOverride = bulkAmountOverride
                  && bulkAmountOverride.productId === selectedProduct?.id
                  && bulkAmountOverride.quantityKg === enteredWeight;
                const grossItemTotal = validBulkAmountOverride
                  ? bulkAmountOverride.amount
                  : Math.round(enteredWeight * enteredUnitPrice * 100) / 100;
                const itemTotal = Math.max(0, Math.round((grossItemTotal - enteredItemDiscount) * 100) / 100);
                const matchingProducts = search.length >= 2 ? (productSearchQuery?.data ?? []) : [];
                return (
                <div key={field.id} className="sale-item-row grid gap-3 rounded-lg border border-border bg-slate-50/60 p-3 xl:grid-cols-[minmax(15rem,1.3fr)_minmax(11rem,1fr)_100px_130px_125px_44px]" onFocus={() => { if (bulkWeightProduct) setActiveBulkItemId(field.id); }}>
                  <div className="space-y-2">
                    <input type="hidden" {...form.register(`items.${index}.productId`)} />
                    <Input
                      label="Buscar produto"
                      placeholder="Digite nome, código, SKU ou código de barras"
                      value={productSearches[field.id] ?? ""}
                      onChange={(event) => setProductSearches((current) => ({ ...current, [field.id]: event.target.value }))}
                    />
                    {selectedProduct ? <div className="flex items-center justify-between gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs"><span><strong className="block text-brand-800">Selecionado: {selectedProduct.name}</strong><span className="text-brand-700">{selectedProduct.code ? `Código ${selectedProduct.code} · ` : ""}preço {formatCurrency(selectedProduct.salePrice)}{bulkWeightProduct ? "/kg" : `/${selectedProduct.unit.toLocaleLowerCase("pt-BR")}`} · estoque {selectedProduct.stockQuantity} {bulkWeightProduct ? "kg" : unitLabels[selectedProduct.unit] ?? selectedProduct.unit}</span></span><Button className="h-8 shrink-0 px-2" variant="ghost" onClick={() => { form.setValue(`items.${index}.productId`, ""); form.setValue(`items.${index}.quantity`, 1); if (activeBulkItemId === field.id) setActiveBulkItemId(null); setBulkAmountOverrides((current) => { const next = { ...current }; delete next[field.id]; return next; }); setSelectedProducts((current) => { const next = { ...current }; delete next[field.id]; return next; }); }}>Limpar</Button></div> : null}
                    {search.length >= 2 ? <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-sm">
                      {productSearchQuery?.isFetching && !productSearchQuery.data ? <p className="px-3 py-4 text-center text-sm text-subdued">Buscando produtos...</p> : null}
                      {matchingProducts.map((product) => <button
                        key={product.id}
                        type="button"
                        className="block w-full border-b border-border px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
                        onClick={() => {
                          form.setValue(`items.${index}.productId`, product.id, { shouldValidate: true });
                          form.setValue(`items.${index}.description`, product.name, { shouldValidate: true });
                          form.setValue(`items.${index}.unitPrice`, product.salePrice, { shouldValidate: true });
                          form.setValue(`items.${index}.discount`, 0, { shouldValidate: true });
                          form.setValue(`items.${index}.quantity`, isBulkWeightProduct(product) ? 0 : 1, { shouldDirty: true });
                          form.clearErrors(`items.${index}.quantity`);
                          setBulkAmountOverrides((current) => { const next = { ...current }; delete next[field.id]; return next; });
                          setSelectedProducts((current) => ({ ...current, [field.id]: product }));
                          setActiveBulkItemId(isBulkWeightProduct(product) ? field.id : null);
                          setProductSearches((current) => ({ ...current, [field.id]: "" }));
                          setDebouncedProductSearches((current) => ({ ...current, [field.id]: "" }));
                        }}
                      ><span className="flex items-start justify-between gap-3"><strong>{product.code ? `${product.code} · ` : ""}{product.name}</strong><strong className="shrink-0 text-brand-700">{formatCurrency(product.salePrice)}{isBulkWeightProduct(product) ? "/kg" : ""}</strong></span><span className="mt-0.5 block text-xs text-subdued">Estoque {product.stockQuantity} {isBulkWeightProduct(product) ? "kg" : unitLabels[product.unit] ?? product.unit}{product.sku ? ` · SKU ${product.sku}` : ""}</span></button>)}
                      {!productSearchQuery?.isFetching && !matchingProducts.length ? <p className="px-3 py-4 text-center text-sm text-subdued">Nenhum produto encontrado. Preencha a descrição para usar um item avulso.</p> : null}
                      {productSearchQuery?.isError ? <p className="px-3 py-4 text-center text-sm text-danger">Não foi possível buscar os produtos. Tente novamente.</p> : null}
                    </div> : <p className="sale-product-hint text-xs text-subdued">{rawSearch.length === 1 ? "Digite mais um caractere para pesquisar." : "Os resultados aparecerão abaixo."}</p>}
                  </div>
                  <Input
                    label="Descrição"
                    error={form.formState.errors.items?.[index]?.description?.message}
                    {...form.register(`items.${index}.description`)}
                  />
                  <Input
                    label={bulkWeightProduct ? "Peso (kg)" : "Quantidade"}
                    help={bulkWeightProduct ? "Digite o peso em quilogramas. Exemplo: 0,300 kg de um produto a R$ 23,50/kg totaliza R$ 7,05." : undefined}
                    placeholder={bulkWeightProduct ? "Ex.: 0,300" : undefined}
                    mask="decimal"
                    error={form.formState.errors.items?.[index]?.quantity?.message}
                    {...form.register(`items.${index}.quantity`)}
                  />
                  <div className="space-y-2">
                    <Input
                      label={bulkWeightProduct ? "Preço por kg" : "Preço unitário"}
                      help={bulkWeightProduct ? "Preço fixo definido no cadastro do produto. Para alterá-lo, edite o produto." : "Valor cobrado por uma unidade deste item."}
                      mask="currency"
                      readOnly={bulkWeightProduct}
                      className={bulkWeightProduct ? "cursor-not-allowed bg-slate-100 text-slate-700" : undefined}
                      error={form.formState.errors.items?.[index]?.unitPrice?.message}
                      {...form.register(`items.${index}.unitPrice`)}
                    />
                    {bulkWeightProduct ? <p className="whitespace-nowrap text-xs font-semibold text-brand-700">Subtotal: {formatCurrency(grossItemTotal)}</p> : null}
                    {validBulkAmountOverride ? <p className="text-[11px] text-subdued">Valor informado pelo cliente</p> : null}
                    {bulkWeightProduct ? <Button type="button" variant="secondary" className="h-8 w-full px-2 text-xs" onClick={() => openPriceCalculator(field.id)}>Por valor (Alt+P)</Button> : null}
                  </div>
                  <div className="space-y-2">
                    <Input
                      label="Desconto do item"
                      help="Desconto em reais aplicado somente a este produto."
                      mask="currency"
                      error={form.formState.errors.items?.[index]?.discount?.message}
                      {...form.register(`items.${index}.discount`)}
                    />
                    <p className="whitespace-nowrap text-xs font-semibold text-success">Total: {formatCurrency(itemTotal)}</p>
                  </div>
                  <Button
                    className="sale-item-remove mt-6 h-10 px-0"
                    variant="ghost"
                    title="Remover item"
                    onClick={() => { if (items.fields.length > 1) { setBulkAmountOverrides((current) => { const next = { ...current }; delete next[field.id]; return next; }); items.remove(index); } }}
                  >
                    <Minus size={18} />
                  </Button>
                </div>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Acréscimo" mask="currency" {...form.register("surcharge")} />
              <Input label="Observações" {...form.register("notes")} />
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <Button type="submit" disabled={createSale.isPending}>
              <Save size={18} />
              Salvar venda
            </Button>
          </form>
        </Card>

        <div className="erp-side-stack sale-summary-stack space-y-5">
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
                <span className="text-subdued">Descontos dos itens</span>
                <strong>{formatCurrency(itemDiscountTotal)}</strong>
              </div>
              {bulkRoundingAdjustment !== 0 ? <div className="flex justify-between text-xs">
                <span className="text-subdued">Ajuste de arredondamento do granel</span>
                <strong>{bulkRoundingAdjustment > 0 ? "- " : "+ "}{formatCurrency(Math.abs(bulkRoundingAdjustment))}</strong>
              </div> : null}
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
        open={Boolean(success)}
        className="max-w-md"
        title="Venda lançada com sucesso"
        description={success ?? undefined}
        onClose={() => setSuccess(null)}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-900">
            A venda foi registrada e o estoque e o caixa já foram atualizados.
          </div>
          {lastReceipt?.sale.fiscal?.status === "PENDING_CORRECTION" ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>NFC-e pendente de correção{lastReceipt.sale.fiscal.branchName ? ` na loja ${lastReceipt.sale.fiscal.branchName}` : ""}.</strong><p className="mt-1">{lastReceipt.sale.fiscal.message}</p><a className="mt-3 inline-flex font-semibold text-brand-700 underline" href="/fiscal">Abrir gestão fiscal para corrigir e tentar novamente</a></div> : lastReceipt?.sale.fiscal?.status === "DISABLED" ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"><strong>Venda registrada sem emissão de NFC-e.</strong><p className="mt-1">{lastReceipt.sale.fiscal.message}</p></div> : lastReceipt?.sale.fiscal?.status === "SKIPPED_SERVICE" ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Venda de serviço registrada sem NFC-e.</strong><p className="mt-1">{lastReceipt.sale.fiscal.message}</p></div> : lastReceipt?.sale.fiscal?.status === "AUTHORIZED" ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{lastReceipt.sale.fiscal.message}</div> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={downloadReceipt}><FileDown size={16}/>Baixar recibo</Button>
            <Button onClick={() => {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: "sale-created" }, window.location.origin);
                window.close();
                return;
              }
              setSuccess(null);
            }}>{isPopupWindow ? "OK e fechar" : "OK, nova venda"}</Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={Boolean(priceCalculatorItemId)}
        className="max-w-lg"
        title="Venda de granel por valor"
        description="Informe quanto o cliente quer pagar e o peso será calculado automaticamente."
        onClose={() => { setPriceCalculatorItemId(null); setDesiredSaleValue(""); setPriceCalculatorError(null); }}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm">
            <p className="font-semibold text-brand-800">{priceCalculatorProduct?.name ?? "Produto a granel"}</p>
            <p className="mt-1 text-brand-700">Preço atual: {formatCurrency(pricePerKilogram)} por kg</p>
          </div>
          <Input
            id="bulk-sale-value"
            autoFocus
            label="Valor que o cliente quer pagar"
            placeholder="Ex.: R$ 12,00"
            mask="currency"
            value={desiredSaleValue}
            onChange={(event) => { setDesiredSaleValue(event.target.value); setPriceCalculatorError(null); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPriceCalculation(); } }}
          />
          <div className="rounded-lg border border-border bg-muted p-4 text-center">
            <p className="text-xs text-subdued">Peso calculado</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{calculatedWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</p>
            <p className="mt-1 text-xs text-subdued">{formatCurrency(desiredAmount)} ÷ {formatCurrency(pricePerKilogram)}/kg</p>
          </div>
          {priceCalculatorError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{priceCalculatorError}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => { setPriceCalculatorItemId(null); setDesiredSaleValue(""); setPriceCalculatorError(null); }}>Cancelar</Button>
            <Button type="button" onClick={applyPriceCalculation}>Aplicar valor e peso</Button>
          </div>
        </div>
      </Modal>
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
