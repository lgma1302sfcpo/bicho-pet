"use client";

import { Boxes, PackageSearch, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { ProductCreateForm } from "@/components/products/product-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function ProductManagementPage() {
  const [filters, setFilters] = useState<ProductFiltersDTO>({
    lowStockOnly: false
  });
  const productsQuery = useProducts(filters);
  const deleteProduct = useDeleteProduct();
  const [editingProduct, setEditingProduct] = useState<ProductListItemDTO | null>(null);
  const products = productsQuery.data?.products ?? [];
  const summary = productsQuery.data?.summary;
  const activeFilters = [filters.search ? `Busca: ${filters.search}` : null, filters.category ? `Categoria: ${filters.category}` : null, filters.species ? `Especie: ${speciesLabels[filters.species]}` : null, filters.lowStockOnly ? "Somente estoque baixo" : null, filters.status ? `Situacao: ${filters.status === "ACTIVE" ? "Ativo" : filters.status === "INACTIVE" ? "Inativo" : "Descontinuado"}` : null].filter(Boolean) as string[];

  function updateFilter<Key extends keyof ProductFiltersDTO>(key: Key, value: ProductFiltersDTO[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Produtos</h1>
        <p className="text-sm text-subdued">Cadastro de produtos para petshop, com alerta de estoque baixo.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
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

      <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
        <div className="space-y-5">
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand-700" />
              <h2 className="text-base font-semibold">Filtros</h2>
              </div>
              <Button variant="ghost" onClick={() => setFilters({ lowStockOnly: false })}>Limpar filtros</Button>
            </div>
            <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{activeFilters.length ? <><strong>Filtros aplicados:</strong> {activeFilters.join(" · ")}. Foram encontrados {products.length} produto(s).</> : <span>Nenhum filtro especifico aplicado. Exibindo todos os produtos.</span>}</div>
            <div className="grid gap-3 md:grid-cols-5">
              <Input
                label="Buscar"
                placeholder="nome, codigo, marca, fornecedor"
                value={filters.search ?? ""}
                onChange={(event) => updateFilter("search", event.target.value)}
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
                label="Especie"
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
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Lista de produtos</h2>
                <p className="text-sm text-subdued">Itens cadastrados para venda e controle basico.</p>
              </div>
              <Badge className={activeFilters.length ? "border-brand-200 bg-brand-50 text-brand-700" : ""}>{activeFilters.length ? `Resultado filtrado: ${products.length}` : `${products.length} produtos`}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-subdued">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Especie</th>
                    <th className="px-4 py-3">Preco</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3">Markup sobre o custo</th>
                    <th className="px-4 py-3">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <tr key={product.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-subdued">
                          {product.brand ? `${product.brand} · ` : ""}
                          {product.sku || product.code || product.barcode || "Sem codigo"}
                          {product.supplier ? ` · ${product.supplier}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.category}
                        {product.subcategory ? <div className="text-xs text-subdued">{product.subcategory}</div> : null}
                      </td>
                      <td className="px-4 py-3">{speciesLabels[product.species] ?? product.species}</td>
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
                        <div className="text-xs text-subdued">Estoque minimo: {product.minStock}</div>
                      </td>
                      <td className="px-4 py-3"><strong>{product.marginPercent.toFixed(2)}%</strong><div className="text-xs text-subdued">Lucro unitario {formatCurrency(product.salePrice - product.costPrice)}</div></td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-subdued" colSpan={7}>
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700">
                <PackageSearch size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Rotina de petshop</h2>
                <p className="mt-1 text-sm text-subdued">
                  Use estoque minimo para racoes, petiscos e medicamentos. O filtro de baixo estoque mostra o que precisa repor.
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
                <h2 className="font-semibold">Proximo passo</h2>
                <p className="mt-1 text-sm text-subdued">
                  O modulo de estoque registra entradas, saidas e ajustes usando estes produtos.
                </p>
              </div>
            </div>
          </Card>
          <ProductCreateForm product={editingProduct} onCancel={() => setEditingProduct(null)} />
        </div>
      </section>
    </div>
  );
}
