"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductListItemDTO, UpdateProductDTO } from "@/dtos/catalog/product.dto";
import { useCreateProduct, useUpdateProduct } from "@/hooks/catalog/use-products";
import { updateProductSchema } from "@/schemas/catalog/product.schemas";
import { parseBrazilianNumber } from "@/lib/utils";

const categorySuggestions = [
  "Acessórios",
  "Aquário",
  "Aves",
  "Banho e Tosa",
  "Cão Adulto Premium",
  "Doces",
  "Gato Adulto Premium Especial",
  "Granel",
  "Higiene",
  "Jardinagem",
  "Medicação",
  "Medicamentos/Suplementos",
  "Pacoteira",
  "Peixes",
  "Petisco",
  "Ração a Granel",
  "Ração Pacoteira",
  "Ração Sacaria",
  "Roedores",
  "Sacaria",
  "Serviço",
  "Vestuário"
];
const subcategorySuggestions = ["Ração seca", "Ração úmida", "Ração a granel", "Petisco natural", "Higiene bucal", "Banho e tosa", "Antipulgas", "Suplemento", "Brinquedo interativo", "Coleira e guia", "Outro"];
const brandSuggestions = ["Adimax", "GranPlus", "Premier Pet", "Purina", "Royal Canin", "Golden", "Special Dog", "Whiskas", "Pedigree", "Chalesco", "Outras marcas"];
const supplierSuggestions = ["Adimax", "Cobasi Distribuidora", "Distribuidora Petmar", "Mars Petcare", "Nestle Purina", "Premier Pet", "Royal Canin", "Distribuidor regional", "Outro fornecedor"];

type ProductFormProps = {
  product?: ProductListItemDTO | null;
  onCancel?: () => void;
  onSuccess?: () => void;
};

const emptyProduct: UpdateProductDTO = {
  name: "", code: "", sku: "", barcode: "", category: categorySuggestions[0], subcategory: "", brand: "", supplier: "", unit: "UN",
  species: "ALL", description: "", costPrice: 0, salePrice: 0, stockQuantity: 0,
  minStock: 0, maxStock: 0, location: "", imageUrl: "", status: "ACTIVE",
  fiscalItemType: "GOOD", ncm: "", cest: "", originCode: "0", defaultCfop: "", icmsCode: "",
  pisCode: "", cofinsCode: "", ibsCbsCode: "", taxClassificationCode: "", serviceCode: "",
  issRate: undefined, fiscalApproved: false
};

export function ProductCreateForm({ product, onCancel, onSuccess }: ProductFormProps) {
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
  const categories = product?.category && !categorySuggestions.includes(product.category)
    ? [product.category, ...categorySuggestions]
    : categorySuggestions;

  useEffect(() => {
    form.reset(product ? ({ ...product, status: product.status as UpdateProductDTO["status"] } as unknown as UpdateProductDTO) : emptyProduct);
    setError(null);
  }, [form, product]);

  async function onSubmit(values: UpdateProductDTO) {
    setError(null);

    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, payload: values });
      } else {
        await createProduct.mutateAsync(values);
        form.reset(emptyProduct);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o produto.");
    }
  }

  function onInvalid(errors: FieldErrors<UpdateProductDTO>) {
    const firstError = Object.values(errors).find((fieldError) => fieldError?.message);
    setError(typeof firstError?.message === "string"
      ? firstError.message
      : "Revise os campos destacados antes de cadastrar o produto.");
  }

  return (
    <div>
      <form className="erp-form space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <Input label="Nome do produto" error={form.formState.errors.name?.message} {...form.register("name")} />
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Código do produto" help="Código usado pela própria loja para localizar o produto." error={form.formState.errors.code?.message} {...form.register("code")} />
          <Input label="Código interno de estoque" help="Identificador interno que diferencia variações do mesmo produto." error={form.formState.errors.sku?.message} {...form.register("sku")} />
          <Input label="Código de barras" mask="integer" error={form.formState.errors.barcode?.message} {...form.register("barcode")} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Categoria" error={form.formState.errors.category?.message} {...form.register("category")}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Select label="Subcategoria" error={form.formState.errors.subcategory?.message} {...form.register("subcategory")}><option value="">Sem subcategoria</option>{subcategorySuggestions.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Marca" error={form.formState.errors.brand?.message} {...form.register("brand")}><option value="">Sem marca</option>{brandSuggestions.map((item) => <option key={item}>{item}</option>)}</Select>
          <div>
            <Input label="Fornecedor" list="supplier-suggestions" placeholder="Digite ou selecione o fornecedor" help="Empresa de quem a loja compra este produto." error={form.formState.errors.supplier?.message} {...form.register("supplier")} />
            <datalist id="supplier-suggestions">{supplierSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Espécie" error={form.formState.errors.species?.message} {...form.register("species")}>
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
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Preço de custo"
            help="Quanto a loja paga ao fornecedor por uma unidade. Este valor é usado para calcular o lucro."
            mask="currency"
            error={form.formState.errors.costPrice?.message}
            {...form.register("costPrice")}
          />
          <Input
            label="Preço de venda"
            help="Valor cobrado do cliente por uma unidade."
            mask="currency"
            error={form.formState.errors.salePrice?.message}
            {...form.register("salePrice")}
          />
        </div>
        <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 md:grid-cols-2"><div><p className="text-xs font-medium text-emerald-800">Lucro bruto por unidade</p><p className="text-lg font-semibold text-emerald-900">{grossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div><p className="text-xs font-medium text-emerald-800">Markup sobre o custo</p><p className="text-lg font-semibold text-emerald-900">{markup.toFixed(2)}%</p><p className="text-xs text-emerald-800">Percentual acrescentado ao custo para chegar ao preço de venda.</p></div></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Estoque atual"
            mask="decimal"
            error={form.formState.errors.stockQuantity?.message}
            {...form.register("stockQuantity")}
          />
          <Input
            label="Estoque mínimo"
            help="Quando o saldo chegar a este valor, o produto será marcado para reposição."
            mask="decimal"
            error={form.formState.errors.minStock?.message}
            {...form.register("minStock")}
          />
          <Input
            label="Estoque máximo"
            mask="decimal"
            error={form.formState.errors.maxStock?.message}
            {...form.register("maxStock")}
          />
        </div>
        <Select label="Localização no estoque" error={form.formState.errors.location?.message} {...form.register("location")}><option value="">Não informada</option><option>Balcão</option><option>Depósito</option><option>Prateleira A</option><option>Prateleira B</option><option>Prateleira C</option><option>Área de medicamentos</option><option>Área de banho e tosa</option></Select>
        <Input label="Descrição" error={form.formState.errors.description?.message} {...form.register("description")} />
        <div className="erp-form-section rounded-md border border-border bg-slate-50 p-3 sm:p-4">
          <div className="mb-3">
            <h3 className="font-semibold">Dados fiscais</h3>
            <p className="text-xs text-subdued">Preencha somente com a matriz validada pelo contador. A aprovação fiscal é obrigatória antes da emissão.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Tipo do item" help="Mercadorias usam NCM; serviços usam o código municipal ou nacional do serviço." error={form.formState.errors.fiscalItemType?.message} {...form.register("fiscalItemType")}>
              <option value="GOOD">Mercadoria</option>
              <option value="SERVICE">Serviço</option>
            </Select>
            <Select label="Origem da mercadoria" help="Código definido na matriz tributária do contador." error={form.formState.errors.originCode?.message} {...form.register("originCode")}>
              <option value="">Selecione</option><option value="0">0 - Nacional</option><option value="1">1 - Estrangeira, importação direta</option><option value="2">2 - Estrangeira, adquirida no mercado interno</option><option value="3">3 - Nacional com conteúdo importado superior a 40%</option><option value="4">4 - Nacional conforme processos produtivos básicos</option><option value="5">5 - Nacional com conteúdo importado até 40%</option><option value="6">6 - Estrangeira sem similar nacional, importação direta</option><option value="7">7 - Estrangeira sem similar nacional, mercado interno</option><option value="8">8 - Nacional com conteúdo importado superior a 70%</option>
            </Select>
            <Input label="Nomenclatura Comum do Mercosul" help="Código de oito números validado pelo contador para mercadorias." mask="integer" maxLength={8} error={form.formState.errors.ncm?.message} {...form.register("ncm")} />
            <Input label="Código Especificador da Substituição Tributária" help="Código de sete números, somente quando aplicável." mask="integer" maxLength={7} error={form.formState.errors.cest?.message} {...form.register("cest")} />
            <Input label="Código Fiscal de Operações e Prestações padrão" help="Código de quatro números para a operação de venda padrão; outras operações podem exigir código diferente." mask="integer" maxLength={4} error={form.formState.errors.defaultCfop?.message} {...form.register("defaultCfop")} />
            <Input label="Código do Imposto sobre Circulação de Mercadorias e Serviços" help="Informe o Código de Situação Tributária ou o Código de Situação da Operação no Simples Nacional." error={form.formState.errors.icmsCode?.message} {...form.register("icmsCode")} />
            <Input label="Código do Programa de Integração Social" error={form.formState.errors.pisCode?.message} {...form.register("pisCode")} />
            <Input label="Código da Contribuição para o Financiamento da Seguridade Social" error={form.formState.errors.cofinsCode?.message} {...form.register("cofinsCode")} />
            <Input label="Código do Imposto sobre Bens e Serviços e da Contribuição sobre Bens e Serviços" help="Campo previsto nas regras da Reforma Tributária. Use o valor informado pelo contador." error={form.formState.errors.ibsCbsCode?.message} {...form.register("ibsCbsCode")} />
            <Input label="Código de classificação tributária" help="Classificação tributária informada pelo contador conforme o leiaute vigente." error={form.formState.errors.taxClassificationCode?.message} {...form.register("taxClassificationCode")} />
            <Input label="Código do serviço" help="Obrigatório para itens de serviço emitidos em Nota Fiscal de Serviço Eletrônica." error={form.formState.errors.serviceCode?.message} {...form.register("serviceCode")} />
            <Input label="Alíquota do Imposto sobre Serviços" mask="decimal" help="Percentual validado pelo contador e pelo município. Para mercadorias, deixe este campo vazio." error={form.formState.errors.issRate?.message} {...form.register("issRate")} />
            <Select label="Validação do contador" help="Marque como aprovado somente depois de o contador conferir este cadastro." error={form.formState.errors.fiscalApproved?.message} {...form.register("fiscalApproved", { setValueAs: (value) => value === "true" })}>
              <option value="false">Pendente de validação</option>
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

        <div className="erp-form-actions sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-white/95 px-4 pb-1 pt-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:p-0">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="sm:min-w-48" disabled={createProduct.isPending || updateProduct.isPending}>
          <Save size={18} />
          {createProduct.isPending || updateProduct.isPending ? "Salvando..." : product ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
