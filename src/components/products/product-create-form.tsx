"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductListItemDTO, UpdateProductDTO } from "@/dtos/catalog/product.dto";
import { useCreateProduct, useUpdateProduct } from "@/hooks/catalog/use-products";
import { updateProductSchema } from "@/schemas/catalog/product.schemas";
import { parseBrazilianNumber } from "@/lib/utils";

const categorySuggestions = ["Racao", "Petisco", "Higiene", "Medicamento", "Brinquedo", "Acessorio", "Servico"];
const subcategorySuggestions = ["Racao seca", "Racao umida", "Racao a granel", "Petisco natural", "Higiene bucal", "Banho e tosa", "Antipulgas", "Suplemento", "Brinquedo interativo", "Coleira e guia", "Outro"];
const brandSuggestions = ["Adimax", "GranPlus", "Premier Pet", "Purina", "Royal Canin", "Golden", "Special Dog", "Whiskas", "Pedigree", "Chalesco", "Outras marcas"];
const supplierSuggestions = ["Adimax", "Cobasi Distribuidora", "Distribuidora Petmar", "Mars Petcare", "Nestle Purina", "Premier Pet", "Royal Canin", "Distribuidor regional", "Outro fornecedor"];

type ProductFormProps = {
  product?: ProductListItemDTO | null;
  onCancel?: () => void;
};

const emptyProduct: UpdateProductDTO = {
  name: "", code: "", sku: "", barcode: "", category: "Racao", subcategory: "", brand: "", supplier: "", unit: "UN",
  species: "ALL", description: "", costPrice: 0, salePrice: 0, stockQuantity: 0,
  minStock: 0, maxStock: 0, location: "", imageUrl: "", status: "ACTIVE",
  fiscalItemType: "GOOD", ncm: "", cest: "", originCode: "0", defaultCfop: "", icmsCode: "",
  pisCode: "", cofinsCode: "", ibsCbsCode: "", taxClassificationCode: "", serviceCode: "",
  fiscalApproved: false
};

export function ProductCreateForm({ product, onCancel }: ProductFormProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdateProductDTO>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: emptyProduct
  });
  const watchedCost = Number(parseBrazilianNumber(form.watch("costPrice")) ?? 0);
  const watchedSale = Number(parseBrazilianNumber(form.watch("salePrice")) ?? 0);
  const markup = watchedCost > 0 ? ((watchedSale - watchedCost) / watchedCost) * 100 : 0;
  const grossProfit = watchedSale - watchedCost;

  useEffect(() => {
    form.reset(product ? ({ ...product, status: product.status as UpdateProductDTO["status"] } as unknown as UpdateProductDTO) : emptyProduct);
    setError(null);
  }, [form, product]);

  async function onSubmit(values: UpdateProductDTO) {
    setError(null);

    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, payload: values });
        onCancel?.();
      } else {
        await createProduct.mutateAsync(values);
        form.reset(emptyProduct);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar produto.");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{product ? "Editar produto" : "Novo produto"}</h2>
          {product ? <Button variant="ghost" onClick={onCancel} aria-label="Cancelar edicao"><X size={18} /></Button> : null}
        </div>
        <p className="text-sm text-subdued">Cadastro para petshop com preco e estoque minimo.</p>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input label="Nome do produto" error={form.formState.errors.name?.message} {...form.register("name")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Codigo do produto" help="Codigo usado pela propria loja para localizar o produto." error={form.formState.errors.code?.message} {...form.register("code")} />
          <Input label="Codigo interno de estoque" help="Identificador interno que diferencia variacoes do mesmo produto." error={form.formState.errors.sku?.message} {...form.register("sku")} />
          <Input label="Codigo de barras" mask="integer" error={form.formState.errors.barcode?.message} {...form.register("barcode")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Categoria" error={form.formState.errors.category?.message} {...form.register("category")}>
            {categorySuggestions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Select label="Subcategoria" error={form.formState.errors.subcategory?.message} {...form.register("subcategory")}><option value="">Sem subcategoria</option>{subcategorySuggestions.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Marca" error={form.formState.errors.brand?.message} {...form.register("brand")}><option value="">Sem marca</option>{brandSuggestions.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Fornecedor" help="Empresa de quem a loja compra este produto." error={form.formState.errors.supplier?.message} {...form.register("supplier")}><option value="">Fornecedor nao informado</option>{supplierSuggestions.map((item) => <option key={item}>{item}</option>)}</Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Especie" error={form.formState.errors.species?.message} {...form.register("species")}>
            <option value="ALL">Todas</option>
            <option value="DOG">Cachorro</option>
            <option value="CAT">Gato</option>
            <option value="BIRD">Ave</option>
            <option value="FISH">Peixe</option>
            <option value="RODENT">Roedor</option>
            <option value="OTHER">Outro</option>
          </Select>
          <Select label="Unidade de medida" error={form.formState.errors.unit?.message} {...form.register("unit")}><option value="UN">Unidade</option><option value="KG">Quilograma</option><option value="G">Grama</option><option value="L">Litro</option><option value="ML">Mililitro</option><option value="CX">Caixa</option><option value="PC">Pacote</option></Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Preco de custo"
            help="Quanto a loja paga ao fornecedor por uma unidade. Este valor e usado para calcular o lucro."
            mask="currency"
            error={form.formState.errors.costPrice?.message}
            {...form.register("costPrice")}
          />
          <Input
            label="Preco de venda"
            help="Valor cobrado do cliente por uma unidade."
            mask="currency"
            error={form.formState.errors.salePrice?.message}
            {...form.register("salePrice")}
          />
        </div>
        <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 sm:grid-cols-2"><div><p className="text-xs font-medium text-emerald-800">Lucro bruto por unidade</p><p className="text-lg font-semibold text-emerald-900">{grossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div><p className="text-xs font-medium text-emerald-800">Markup sobre o custo</p><p className="text-lg font-semibold text-emerald-900">{markup.toFixed(2)}%</p><p className="text-xs text-emerald-800">Percentual acrescentado ao custo para chegar ao preco de venda.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Estoque atual"
            mask="decimal"
            error={form.formState.errors.stockQuantity?.message}
            {...form.register("stockQuantity")}
          />
          <Input
            label="Estoque minimo"
            help="Quando o saldo chegar a este valor, o produto sera marcado para reposicao."
            mask="decimal"
            error={form.formState.errors.minStock?.message}
            {...form.register("minStock")}
          />
          <Input
            label="Estoque maximo"
            mask="decimal"
            error={form.formState.errors.maxStock?.message}
            {...form.register("maxStock")}
          />
        </div>
        <Select label="Localizacao no estoque" error={form.formState.errors.location?.message} {...form.register("location")}><option value="">Nao informada</option><option>Balcao</option><option>Deposito</option><option>Prateleira A</option><option>Prateleira B</option><option>Prateleira C</option><option>Area de medicamentos</option><option>Area de banho e tosa</option></Select>
        <Input label="Descricao" error={form.formState.errors.description?.message} {...form.register("description")} />
        <div className="rounded-md border border-border bg-slate-50 p-3">
          <div className="mb-3">
            <h3 className="font-semibold">Dados fiscais</h3>
            <p className="text-xs text-subdued">Preencha somente com a matriz validada pelo contador. A aprovacao fiscal e obrigatoria antes da emissao.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Tipo do item" help="Mercadorias usam NCM; servicos usam o codigo municipal ou nacional do servico." {...form.register("fiscalItemType")}>
              <option value="GOOD">Mercadoria</option>
              <option value="SERVICE">Servico</option>
            </Select>
            <Select label="Origem da mercadoria" help="Codigo definido na matriz tributaria do contador." {...form.register("originCode")}>
              <option value="">Selecione</option><option value="0">0 - Nacional</option><option value="1">1 - Estrangeira, importacao direta</option><option value="2">2 - Estrangeira, adquirida no mercado interno</option><option value="3">3 - Nacional com conteudo importado superior a 40%</option><option value="4">4 - Nacional conforme processos produtivos basicos</option><option value="5">5 - Nacional com conteudo importado ate 40%</option><option value="6">6 - Estrangeira sem similar nacional, importacao direta</option><option value="7">7 - Estrangeira sem similar nacional, mercado interno</option><option value="8">8 - Nacional com conteudo importado superior a 70%</option>
            </Select>
            <Input label="Nomenclatura Comum do Mercosul" help="Codigo de oito numeros validado pelo contador para mercadorias." mask="integer" maxLength={8} error={form.formState.errors.ncm?.message} {...form.register("ncm")} />
            <Input label="Codigo Especificador da Substituicao Tributaria" help="Codigo de sete numeros, somente quando aplicavel." mask="integer" maxLength={7} error={form.formState.errors.cest?.message} {...form.register("cest")} />
            <Input label="Codigo Fiscal de Operacoes e Prestacoes padrao" help="Codigo de quatro numeros para a operacao de venda padrao; outras operacoes podem exigir codigo diferente." mask="integer" maxLength={4} error={form.formState.errors.defaultCfop?.message} {...form.register("defaultCfop")} />
            <Input label="Codigo do Imposto sobre Circulacao de Mercadorias e Servicos" help="Informe o Codigo de Situacao Tributaria ou o Codigo de Situacao da Operacao no Simples Nacional." {...form.register("icmsCode")} />
            <Input label="Codigo do Programa de Integracao Social" {...form.register("pisCode")} />
            <Input label="Codigo da Contribuicao para o Financiamento da Seguridade Social" {...form.register("cofinsCode")} />
            <Input label="Codigo do Imposto sobre Bens e Servicos e da Contribuicao sobre Bens e Servicos" help="Campo previsto nas regras da Reforma Tributaria. Use o valor informado pelo contador." {...form.register("ibsCbsCode")} />
            <Input label="Codigo de classificacao tributaria" help="Classificacao tributaria informada pelo contador conforme o leiaute vigente." {...form.register("taxClassificationCode")} />
            <Input label="Codigo do servico" help="Obrigatorio para itens de servico emitidos em Nota Fiscal de Servico eletronica." {...form.register("serviceCode")} />
            <Input label="Aliquota do Imposto Sobre Servicos" mask="decimal" help="Percentual validado pelo contador e pelo municipio." {...form.register("issRate")} />
            <Select label="Validacao do contador" help="Marque como aprovado somente depois de o contador conferir este cadastro." {...form.register("fiscalApproved", { setValueAs: (value) => value === "true" })}>
              <option value="false">Pendente de validacao</option>
              <option value="true">Aprovado pelo contador</option>
            </Select>
          </div>
        </div>
        {product ? (
          <Select label="Status" error={form.formState.errors.status?.message} {...form.register("status")}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="DISCONTINUED">Descontinuado</option>
          </Select>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
          <Save size={18} />
          {product ? "Salvar alteracoes" : "Cadastrar produto"}
        </Button>
      </form>
    </Card>
  );
}
