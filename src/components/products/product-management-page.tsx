"use client";

import { Boxes, FileUp, PackageSearch, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductCreateForm } from "@/components/products/product-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataErrorState, DataLoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { ProductFiltersDTO, ProductListItemDTO } from "@/dtos/catalog/product.dto";
import { useDeleteProduct, useProducts } from "@/hooks/catalog/use-products";

const speciesLabels: Record<string, string> = {
  ALL: "Todas",
  DOG: "Cachorro",
  CAT: "Gato",
  BIRD: "Ave",
  FISH: "Peixe",
  RODENT: "Roedor",
  OTHER: "Outro"
};
const unitLabels: Record<string, string> = { UN: "unidades", KG: "quilogramas", G: "gramas", L: "litros", ML: "mililitros", CX: "caixas", PC: "pacotes" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function ProductManagementPage({ canManage = false }: { canManage?: boolean }) {
  const [filters, setFilters] = useState<ProductFiltersDTO>({
    lowStockOnly: false
  });
  const [searchText, setSearchText] = useState("");
  const productsQuery = useProducts(filters);
  const [lastProductData, setLastProductData] = useState(productsQuery.data);
  const deleteProduct = useDeleteProduct();
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [stockImportFile, setStockImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"FULL" | "SUPPLIERS_ONLY">("FULL");
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItemDTO | null>(null);
  const visibleProductData = productsQuery.data ?? lastProductData;
  const products = visibleProductData?.products ?? [];
  const summary = visibleProductData?.summary;
  const activeFilters = [filters.search ? `Busca: ${filters.search}` : null, filters.category ? `Categoria: ${filters.category}` : null, filters.supplier ? `Fornecedor: ${filters.supplier}` : null, filters.species ? `Espécie: ${speciesLabels[filters.species]}` : null, filters.lowStockOnly ? "Somente estoque baixo" : null, filters.status ? `Situação: ${filters.status === "ACTIVE" ? "Ativo" : filters.status === "INACTIVE" ? "Inativo" : "Descontinuado"}` : null].filter(Boolean) as string[];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchText.trim() || undefined }));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (productsQuery.data) setLastProductData(productsQuery.data);
  }, [productsQuery.data]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get("search");
    if (search) setSearchText(search);
  }, []);

  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get("edit");
    if (!productId) return;
    const product = visibleProductData?.products.find((item) => item.id === productId);
    if (!product) return;
    setEditingProduct(product);
    window.history.replaceState({}, "", window.location.pathname);
  }, [visibleProductData?.products]);

  function updateFilter<Key extends keyof ProductFiltersDTO>(key: Key, value: ProductFiltersDTO[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function submitImport() {
    if (!importFile && !stockImportFile) return;
    setImportPending(true); setImportError(null); setImportResult(null);
    try {
      const formData = new FormData();
      formData.set("file", importFile ?? stockImportFile!);
      formData.set("mode", importMode);
      if (importMode === "FULL" && importFile && stockImportFile) formData.set("stockFile", stockImportFile);
      const response = await fetch("/api/products/import", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível importar a planilha.");
      setImportResult(importMode === "SUPPLIERS_ONLY"
        ? `${payload.data.productsUpdated} produto(s) corrigido(s), ${payload.data.historicalSaleItemsUpdated} item(ns) de vendas históricas atualizado(s), ${payload.data.notFound} código(s) não encontrado(s) e ${payload.data.ambiguous} código(s) ambíguo(s).`
        : `${payload.data.imported} produto(s) novo(s) e ${payload.data.updated} produto(s) atualizado(s).`);
      setImportFile(null);
      setStockImportFile(null);
      await productsQuery.refetch();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    } finally {
      setImportPending(false);
    }
  }

  if (productsQuery.isPending && !visibleProductData) {
    return (
      <div className="erp-page">
        <div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Produtos</h1><p className="text-sm text-subdued">Cadastre produtos, acompanhe preços e identifique itens com estoque baixo.</p></div></div>
        <DataLoadingState label="Carregando produtos e saldos de estoque..." />
      </div>
    );
  }

  if (productsQuery.isError && !visibleProductData) {
    return (
      <div className="erp-page">
        <div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Produtos</h1><p className="text-sm text-subdued">Cadastre produtos, acompanhe preços e identifique itens com estoque baixo.</p></div></div>
        <DataErrorState message={productsQuery.error.message} onRetry={() => void productsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Produtos</h1>
          <p className="text-sm text-subdued">Cadastre produtos, acompanhe preços e identifique itens com estoque baixo.</p>
        </div>
        {canManage ? <div className="erp-page-header__actions"><Button variant="secondary" onClick={() => setImportingProducts(true)}><FileUp size={18} />Importar planilha</Button><Button onClick={() => setCreatingProduct(true)}><Plus size={18} />Cadastrar produto</Button></div> : null}
      </div>

      <section className="erp-metrics grid gap-3 sm:grid-cols-3">
        {[
          ["Produtos", summary?.totalProducts ?? 0],
          ["Ativos", summary?.activeProducts ?? 0],
          ["Estoque baixo", summary?.lowStock ?? 0]
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-subdued">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-5">
        <div className="space-y-5 min-w-0">
          <Card className="erp-filter-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand-700" />
              <h2 className="text-base font-semibold">Filtros</h2>
              </div>
              <Button variant="ghost" onClick={() => { setSearchText(""); setFilters({ lowStockOnly: false }); }}>Limpar filtros</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Input
                id="product-search"
                label="Buscar"
                placeholder="nome, código, marca ou fornecedor"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <Select
                label="Categoria"
                value={filters.category ?? ""}
                onChange={(event) => updateFilter("category", event.target.value || undefined)}
              >
                <option value="">Todas</option>
                {(summary?.categories ?? []).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
              <Select
                label="Fornecedor"
                value={filters.supplier ?? ""}
                onChange={(event) => updateFilter("supplier", event.target.value || undefined)}
              >
                <option value="">Todos</option>
                {(summary?.suppliers ?? []).map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </Select>
              <Select
                label="Espécie"
                value={filters.species ?? ""}
                onChange={(event) => updateFilter("species", (event.target.value || undefined) as ProductFiltersDTO["species"])}
              >
                <option value="">Todas</option>
                {Object.entries(speciesLabels).filter(([value]) => value !== "ALL").map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="Estoque"
                value={String(filters.lowStockOnly ?? false)}
                onChange={(event) => updateFilter("lowStockOnly", event.target.value === "true")}
              >
                <option value="false">Todos</option>
                <option value="true">Somente baixo</option>
              </Select>
              <Select
                label="Status"
                value={filters.status ?? ""}
                onChange={(event) => updateFilter("status", (event.target.value || undefined) as ProductFiltersDTO["status"])}
              >
                <option value="">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="DISCONTINUED">Descontinuado</option>
              </Select>
            </div>
            <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{activeFilters.length ? <><strong>Filtros aplicados:</strong> {activeFilters.join(" · ")}. Foram encontrados {products.length} produto(s).</> : <span>Nenhum filtro específico aplicado. Exibindo todos os produtos.</span>}</div>
          </Card>

          <Card className="erp-table-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Lista de produtos</h2>
                <p className="text-sm text-subdued">Itens cadastrados para venda e controle de estoque.</p>
              </div>
              <Badge className={activeFilters.length ? "border-brand-200 bg-brand-50 text-brand-700" : ""}>{activeFilters.length ? `Resultado filtrado: ${products.length}` : `${products.length} produtos`}</Badge>
            </div>
            <div className="divide-y divide-border md:hidden">
              {products.map((product) => (
                <article key={product.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-xs text-subdued">{product.category}{product.brand ? ` · ${product.brand}` : ""}{product.supplier ? ` · ${product.supplier}` : ""}</p>
                    </div>
                    {product.isLowStock ? <Badge className="shrink-0 border-amber-200 bg-amber-50 text-warning">Estoque baixo</Badge> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Preço de custo</p><p className="font-semibold">{formatCurrency(product.costPrice)}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Preço de venda</p><p className="font-semibold">{formatCurrency(product.salePrice)}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Estoque</p><p className="font-semibold">{product.stockQuantity} {unitLabels[product.unit] ?? product.unit}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Markup</p><p className="font-semibold">{product.marginPercent.toFixed(2)}%</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Lucro unitário</p><p className="font-semibold">{formatCurrency(product.salePrice - product.costPrice)}</p></div>
                  </div>
                  {canManage ? <div className="flex gap-2"><Button className="flex-1" variant="secondary" onClick={() => setEditingProduct(product)}><Pencil size={16} />Editar</Button><Button variant="danger" disabled={deleteProduct.isPending} onClick={async () => { if (window.confirm(`Excluir o produto ${product.name}?`)) await deleteProduct.mutateAsync(product.id); }} aria-label={`Excluir ${product.name}`}><Trash2 size={16} /></Button></div> : null}
                </article>
              ))}
              {products.length === 0 ? <p className="p-6 text-center text-sm text-subdued">Nenhum produto encontrado.</p> : null}
            </div>
            <div className="erp-table-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1240px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-subdued">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Espécie</th>
                    <th className="px-4 py-3">Custo</th>
                    <th className="px-4 py-3">Preço de venda</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3">Markup sobre o custo</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <tr key={product.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-subdued">
                          {product.sku || product.code || product.barcode || "Sem código"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.category}
                        {product.subcategory ? <div className="text-xs text-subdued">{product.subcategory}</div> : null}
                      </td>
                      <td className="px-4 py-3">{product.brand ?? "Sem marca"}</td>
                      <td className="px-4 py-3">{product.supplier ?? "Não informado"}</td>
                      <td className="px-4 py-3">{speciesLabels[product.species] ?? product.species}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(product.costPrice)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(product.salePrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>
                            {product.stockQuantity} {unitLabels[product.unit] ?? product.unit}
                          </span>
                          {product.isLowStock ? (
                            <Badge className="border-amber-200 bg-amber-50 text-warning">Baixo</Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-subdued">Estoque mínimo: {product.minStock}</div>
                      </td>
                      <td className="px-4 py-3"><strong>{product.marginPercent.toFixed(2)}%</strong><div className="text-xs text-subdued">Lucro unitário {formatCurrency(product.salePrice - product.costPrice)}</div></td>
                      <td className="px-4 py-3">
                        {canManage ? (
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingProduct(product)} aria-label={`Editar ${product.name}`}>
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="danger"
                            disabled={deleteProduct.isPending}
                            onClick={async () => {
                              if (window.confirm(`Excluir o produto ${product.name}?`)) {
                                await deleteProduct.mutateAsync(product.id);
                                if (editingProduct?.id === product.id) setEditingProduct(null);
                              }
                            }}
                            aria-label={`Excluir ${product.name}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        ) : <span className="text-xs text-subdued">Somente consulta</span>}
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-subdued" colSpan={10}>
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700">
                <PackageSearch size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Rotina de petshop</h2>
                <p className="mt-1 text-sm text-subdued">
                  Use o estoque mínimo para rações, petiscos e medicamentos. O filtro mostra o que precisa ser reposto.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-success">
                <Boxes size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Próximo passo</h2>
                <p className="mt-1 text-sm text-subdued">
                  O módulo de estoque registra entradas, saídas e ajustes usando estes produtos.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Modal
        open={creatingProduct || Boolean(editingProduct)}
        className="erp-modal--product"
        title={editingProduct ? "Editar produto" : "Cadastrar produto"}
        description="Preencha os dados comerciais, de estoque e fiscais do produto."
        onClose={() => { setCreatingProduct(false); setEditingProduct(null); }}
      >
        <ProductCreateForm
          product={editingProduct}
          suppliers={summary?.suppliers}
          onCancel={() => { setCreatingProduct(false); setEditingProduct(null); }}
          onSuccess={() => { setCreatingProduct(false); setEditingProduct(null); }}
        />
      </Modal>
      <Modal
        open={importingProducts}
        className="max-w-xl"
        title="Importar produtos e estoque"
        description="Selecione as duas planilhas juntas. Os dados serão combinados pelo código, SKU ou EAN, e o estoque completará custo, categoria, marca e saldo."
        onClose={() => setImportingProducts(false)}
      >
        <div className="space-y-4">
          <Select label="Tipo de importação" value={importMode} onChange={(event) => { setImportMode(event.target.value as "FULL" | "SUPPLIERS_ONLY"); setStockImportFile(null); setImportError(null); setImportResult(null); }}>
            <option value="FULL">Produtos e estoque</option>
            <option value="SUPPLIERS_ONLY">Somente fornecedores</option>
          </Select>
          <Input label="Planilha de produtos" type="file" accept=".xls,.xlsx" onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportError(null); setImportResult(null); }} />
          {importMode === "FULL" ? <Input label="Planilha de estoque (contém o custo)" type="file" accept=".xls,.xlsx" onChange={(event) => { setStockImportFile(event.target.files?.[0] ?? null); setImportError(null); setImportResult(null); }} /> : <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Atualiza somente o fornecedor pelo código do produto. Preços, estoque, nomes e dados fiscais permanecem inalterados. Os relatórios de vendas anteriores também são corrigidos.</p>}
          {importError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{importError}</p> : null}
          {importResult ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-success">{importResult}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setImportingProducts(false)}>Fechar</Button><Button disabled={(!importFile && !stockImportFile) || importPending} onClick={() => void submitImport()}><FileUp size={17}/>{importPending ? "Importando..." : "Importar e atualizar"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
