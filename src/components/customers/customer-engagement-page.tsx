"use client";

import { Gift, MessageCircle, Pencil, Plus, SlidersHorizontal, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataErrorState, DataLoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import type { CustomerFiltersDTO, CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import { useAssignCustomerBranch, useCustomers, useDeleteCustomer } from "@/hooks/commerce/use-commerce";
import {
  buildCustomerWhatsAppMessage,
  buildWhatsAppUrl,
  WHATSAPP_MESSAGE_TYPES,
  type WhatsAppMessageType
} from "@/lib/customer-whatsapp";
import { parseBrazilianNumber } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

type CustomerEngagementPageProps = {
  canManage?: boolean;
  canAssignBranches?: boolean;
  branches?: Array<{ id: string; name: string }>;
};

export function CustomerEngagementPage({ canManage = false, canAssignBranches = false, branches = [] }: CustomerEngagementPageProps) {
  const [filters, setFilters] = useState<CustomerFiltersDTO>({
    inactiveDays: 60,
    includeNeverPurchased: true,
    contactableOnly: false
  });
  const customersQuery = useCustomers(filters);
  const deleteCustomer = useDeleteCustomer();
  const assignCustomerBranch = useAssignCustomerBranch();
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItemDTO | null>(null);
  const [whatsappCustomer, setWhatsappCustomer] = useState<CustomerListItemDTO | null>(null);
  const [whatsappMessageType, setWhatsappMessageType] = useState<WhatsAppMessageType>("AUTOMATIC");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [search, setSearch] = useState("");
  const customers = useMemo(() => {
    const queryCustomers = customersQuery.data?.customers ?? [];
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return queryCustomers;

    return queryCustomers.filter((customer) => [
      customer.name,
      customer.phone,
      customer.whatsapp,
      customer.document,
      customer.email,
      customer.branchName,
      ...(customer.pets ?? []).map((pet) => pet.name)
    ].some((value) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(normalizedSearch)));
  }, [customersQuery.data?.customers, search]);
  const summary = customersQuery.data?.summary;
  const activeFilterLabels = [
    search ? `Busca: ${search}` : null,
    filters.inactiveDays ? `Sem comprar há ${filters.inactiveDays} dias` : null,
    filters.contactableOnly ? "Somente com contato" : null,
    filters.minTotalSpent !== undefined ? `Gasto mínimo: ${formatCurrency(filters.minTotalSpent)}` : null,
    filters.maxTotalSpent !== undefined ? `Gasto máximo: ${formatCurrency(filters.maxTotalSpent)}` : null,
    filters.birthdayMonth ? "Mês de aniversário" : null,
    filters.unassignedOnly ? "Loja a definir" : null,
    filters.status ? `Situação: ${filters.status === "ACTIVE" ? "Ativo" : filters.status === "INACTIVE" ? "Inativo" : "Bloqueado"}` : null
  ].filter(Boolean) as string[];

  const campaignHint = useMemo(() => {
    if ((filters.inactiveDays ?? 0) >= 90) {
      return "Cupom forte ou contato pelo WhatsApp.";
    }

    if ((filters.inactiveDays ?? 0) >= 60) {
      return "Desconto de retorno com prazo curto.";
    }

    return "Lembrete leve e beneficio pequeno.";
  }, [filters.inactiveDays]);

  function updateFilter<Key extends keyof CustomerFiltersDTO>(key: Key, value: CustomerFiltersDTO[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function applyPreset(nextFilters: CustomerFiltersDTO) {
    setSearch("");
    setFilters(nextFilters);
  }

  function prepareWhatsApp(customer: CustomerListItemDTO) {
    setWhatsappCustomer(customer);
    setWhatsappMessageType("AUTOMATIC");
    setWhatsappMessage(buildCustomerWhatsAppMessage(customer, "AUTOMATIC"));
  }

  function changeWhatsAppMessageType(type: WhatsAppMessageType) {
    setWhatsappMessageType(type);
    if (whatsappCustomer) setWhatsappMessage(buildCustomerWhatsAppMessage(whatsappCustomer, type));
  }

  if (customersQuery.isPending) {
    return (
      <div className="erp-page">
        <div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Clientes</h1><p className="text-sm text-subdued">Localize clientes e prepare mensagens de relacionamento pelo WhatsApp.</p></div></div>
        <DataLoadingState label="Carregando clientes e histórico de compras..." />
      </div>
    );
  }

  if (customersQuery.isError) {
    return (
      <div className="erp-page">
        <div className="erp-page-header"><div><h1 className="text-2xl font-semibold text-ink">Clientes</h1><p className="text-sm text-subdued">Localize clientes e prepare mensagens de relacionamento pelo WhatsApp.</p></div></div>
        <DataErrorState message={customersQuery.error.message} onRetry={() => void customersQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Clientes</h1>
          <p className="text-sm text-subdued">Localize clientes e prepare mensagens de relacionamento pelo WhatsApp.</p>
        </div>
        <div className="erp-page-header__actions flex flex-col gap-2 sm:flex-row">
          {canManage ? <Button onClick={() => setCreatingCustomer(true)}><Plus size={18} />Cadastrar cliente</Button> : null}
          <Link href="/vendas/nova"><Button variant="secondary" className="w-full"><Gift size={18} />Cadastrar venda</Button></Link>
        </div>
      </div>

      <section className="erp-metrics erp-metrics--five grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Clientes", summary?.totalCustomers ?? 0],
          ["Filtrados", customers.length],
          ["Nunca compraram", summary?.neverPurchased ?? 0],
          ["Inativos há 30 dias", summary?.inactive30 ?? 0],
          ["Inativos há 90 dias", summary?.inactive90 ?? 0]
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-subdued">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="erp-filter-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand-700" />
              <h2 className="text-base font-semibold">Filtros de reativação</h2>
              </div>
              <Button variant="ghost" onClick={() => { setSearch(""); setFilters({ includeNeverPurchased: true, contactableOnly: false }); }}>Limpar filtros</Button>
            </div>
            <div className="erp-filter-presets mb-4 flex flex-wrap gap-2">
              {canAssignBranches ? (
                <Button
                  variant="secondary"
                  onClick={() => applyPreset({ includeNeverPurchased: true, contactableOnly: false, unassignedOnly: true })}
                >
                  Loja a definir
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => applyPreset({ inactiveDays: 60, includeNeverPurchased: true, contactableOnly: true })}
              >
                Sem comprar há 60 dias
              </Button>
              <Button
                variant="secondary"
                onClick={() => applyPreset({ inactiveDays: 90, includeNeverPurchased: false, contactableOnly: true })}
              >
                Sem comprar há 90 dias
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  applyPreset({
                    includeNeverPurchased: true,
                    contactableOnly: true,
                    minPurchaseCount: 0,
                    maxPurchaseCount: 0
                  })
                }
              >
                Nunca compraram
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  applyPreset({
                    inactiveDays: 60,
                    includeNeverPurchased: false,
                    contactableOnly: true,
                    minTotalSpent: 300
                  })
                }
              >
                Clientes de alto valor inativos
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Input
                label="Buscar"
                placeholder="nome, telefone, documento"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                label="Sem comprar há"
                value={String(filters.inactiveDays ?? "")}
                onChange={(event) =>
                  updateFilter("inactiveDays", event.target.value ? Number(event.target.value) : undefined)
                }
              >
                <option value="">Qualquer período</option>
                <option value="30">30 dias ou mais</option>
                <option value="60">60 dias ou mais</option>
                <option value="90">90 dias ou mais</option>
                <option value="180">180 dias ou mais</option>
              </Select>
              <Select
                label="Nunca comprou"
                value={String(filters.includeNeverPurchased ?? true)}
                onChange={(event) => updateFilter("includeNeverPurchased", event.target.value === "true")}
              >
                <option value="true">Incluir</option>
                <option value="false">Ocultar</option>
              </Select>
              <Select
                label="Contato"
                value={String(filters.contactableOnly ?? false)}
                onChange={(event) => updateFilter("contactableOnly", event.target.value === "true")}
              >
                <option value="false">Todos</option>
                <option value="true">Com WhatsApp</option>
              </Select>
              <Input
                label="Gasto mínimo"
                help="Mostra somente clientes que já gastaram pelo menos este valor."
                mask="currency"
                value={filters.minTotalSpent === undefined ? "" : formatCurrency(filters.minTotalSpent)}
                onChange={(event) =>
                  updateFilter("minTotalSpent", event.target.value ? Number(parseBrazilianNumber(event.target.value)) : undefined)
                }
              />
              <Input
                label="Gasto máximo"
                mask="currency"
                value={filters.maxTotalSpent === undefined ? "" : formatCurrency(filters.maxTotalSpent)}
                onChange={(event) =>
                  updateFilter("maxTotalSpent", event.target.value ? Number(parseBrazilianNumber(event.target.value)) : undefined)
                }
              />
              <Input
                label="Quantidade mínima de compras"
                mask="integer"
                value={filters.minPurchaseCount ?? ""}
                onChange={(event) =>
                  updateFilter("minPurchaseCount", event.target.value ? Number(event.target.value) : undefined)
                }
              />
              <Input
                label="Quantidade máxima de compras"
                mask="integer"
                value={filters.maxPurchaseCount ?? ""}
                onChange={(event) =>
                  updateFilter("maxPurchaseCount", event.target.value ? Number(event.target.value) : undefined)
                }
              />
              <Select
                label="Aniversário"
                value={String(filters.birthdayMonth ?? "")}
                onChange={(event) =>
                  updateFilter("birthdayMonth", event.target.value ? Number(event.target.value) : undefined)
                }
              >
                <option value="">Todos</option>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" })}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                value={filters.status ?? ""}
                onChange={(event) => updateFilter("status", (event.target.value || undefined) as CustomerFiltersDTO["status"])}
              >
                <option value="">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="BLOCKED">Bloqueado</option>
              </Select>
            </div>
            <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
              {activeFilterLabels.length ? <><strong>Filtros aplicados:</strong> {activeFilterLabels.join(" · ")}. Foram encontrados {customers.length} cliente(s).</> : <span>Nenhum filtro específico aplicado. Exibindo todos os clientes.</span>}
            </div>
          </Card>

          <Card className="erp-table-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Clientes para campanha</h2>
                <p className="text-sm text-subdued">{campaignHint}</p>
              </div>
              <Badge className={activeFilterLabels.length ? "border-brand-200 bg-brand-50 text-brand-700" : ""}>{activeFilterLabels.length ? `Resultado filtrado: ${customers.length}` : `${customers.length} clientes`}</Badge>
            </div>
            {assignCustomerBranch.error ? <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{assignCustomerBranch.error.message}</p> : null}
            <div className="divide-y divide-border md:hidden">
              {customers.map((customer) => (
                <article key={customer.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{customer.name}</h3>
                      <p className="text-xs text-subdued">{customer.whatsapp || customer.phone || "Sem telefone"}</p>
                      <p className="mt-1 text-xs font-medium text-subdued">Loja: {customer.branchName ?? "A definir"}</p>
                      {customer.pets?.length ? <p className="mt-1 text-xs text-brand-700">{customer.pets.map((pet) => pet.name).join(", ")}</p> : null}
                    </div>
                    <Badge className="shrink-0 border-brand-100 bg-brand-50 text-brand-700">{customer.reactivationLabel}</Badge>
                  </div>
                  {!customer.branchId && canAssignBranches ? (
                    <Select
                      aria-label={`Definir loja de ${customer.name}`}
                      defaultValue=""
                      disabled={assignCustomerBranch.isPending}
                      onChange={(event) => event.target.value && assignCustomerBranch.mutate({ id: customer.id, branchId: event.target.value })}
                    >
                      <option value="">Definir loja...</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </Select>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Última compra</p><p className="font-semibold">{formatDate(customer.lastPurchaseAt)}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Tempo sem comprar</p><p className="font-semibold">{customer.daysSinceLastPurchase === null ? "Sem histórico" : `${customer.daysSinceLastPurchase} dias`}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Compras</p><p className="font-semibold">{customer.purchaseCount}</p></div>
                    <div className="rounded-md bg-muted p-2"><p className="text-xs text-subdued">Total gasto</p><p className="font-semibold">{formatCurrency(customer.totalSpent)}</p></div>
                  </div>
                  {customer.whatsapp ? <Button className="w-full border-emerald-200 text-success" variant="secondary" onClick={() => prepareWhatsApp(customer)}><MessageCircle size={16} />Preparar WhatsApp</Button> : null}
                  {canManage ? <div className="flex gap-2"><Button className="flex-1" variant="secondary" onClick={() => setEditingCustomer(customer)}><Pencil size={16} />Editar</Button><Button variant="danger" disabled={deleteCustomer.isPending} onClick={async () => { if (window.confirm(`Excluir o cliente ${customer.name}? As vendas antigas serão mantidas.`)) await deleteCustomer.mutateAsync(customer.id); }} aria-label={`Excluir ${customer.name}`}><Trash2 size={16} /></Button></div> : null}
                </article>
              ))}
              {customers.length === 0 ? <p className="p-6 text-center text-sm text-subdued">Nenhum cliente encontrado para os filtros atuais.</p> : null}
            </div>
            <div className="erp-table-scroll hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-subdued">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Última compra</th>
                    <th className="px-4 py-3">Compras</th>
                    <th className="px-4 py-3">Total gasto</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{customer.name}</div>
                        {customer.pets?.length ? <div className="mt-1 text-xs text-brand-700">Pets: {customer.pets.map((pet) => pet.name).join(", ")}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-subdued">
                        <div>{customer.whatsapp || customer.phone || "Sem telefone"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {customer.branchId ? (
                          <Badge>{customer.branchName ?? "Loja definida"}</Badge>
                        ) : canAssignBranches ? (
                          <Select
                            aria-label={`Definir loja de ${customer.name}`}
                            defaultValue=""
                            disabled={assignCustomerBranch.isPending}
                            onChange={(event) => event.target.value && assignCustomerBranch.mutate({ id: customer.id, branchId: event.target.value })}
                          >
                            <option value="">A definir...</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </Select>
                        ) : <Badge>A definir</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatDate(customer.lastPurchaseAt)}</div>
                        <div className="text-xs text-subdued">
                          {customer.daysSinceLastPurchase === null
                            ? "Sem histórico"
                            : `${customer.daysSinceLastPurchase} dias`}
                        </div>
                      </td>
                      <td className="px-4 py-3">{customer.purchaseCount}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(customer.totalSpent)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Badge className="w-fit border-brand-100 bg-brand-50 text-brand-700">
                            {customer.reactivationLabel}
                          </Badge>
                          {customer.whatsapp ? (
                            <Button
                              variant="secondary"
                              className="border-emerald-200 text-success"
                              onClick={() => prepareWhatsApp(customer)}
                            >
                              <MessageCircle size={16} />
                              Preparar WhatsApp
                            </Button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingCustomer(customer)} aria-label={`Editar ${customer.name}`}><Pencil size={16} />Editar</Button>
                          <Button variant="danger" disabled={deleteCustomer.isPending} onClick={async () => { if (window.confirm(`Excluir o cliente ${customer.name}? As vendas antigas serão mantidas.`)) { await deleteCustomer.mutateAsync(customer.id); if (editingCustomer?.id === customer.id) setEditingCustomer(null); } }} aria-label={`Excluir ${customer.name}`}><Trash2 size={16} /></Button>
                        </div>
                        ) : <span className="text-xs text-subdued">Somente consulta</span>}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-subdued" colSpan={8}>
                        Nenhum cliente encontrado para os filtros atuais.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="erp-side-stack space-y-5">
          {whatsappCustomer ? (
            <Card className="p-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-success">
                    <MessageCircle size={18} />
                    <h2 className="font-semibold text-ink">Preparar WhatsApp</h2>
                  </div>
                  <p className="mt-1 text-sm text-subdued">
                    Para {whatsappCustomer.name} ({whatsappCustomer.whatsapp})
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setWhatsappCustomer(null)}>Fechar</Button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="text-xs text-subdued">Última compra</p>
                  <p className="mt-1 font-semibold">{formatDate(whatsappCustomer.lastPurchaseAt)}</p>
                </div>
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="text-xs text-subdued">Tempo sem comprar</p>
                  <p className="mt-1 font-semibold">
                    {whatsappCustomer.daysSinceLastPurchase == null
                      ? "Sem histórico"
                      : `${whatsappCustomer.daysSinceLastPurchase} ${whatsappCustomer.daysSinceLastPurchase === 1 ? "dia" : "dias"}`}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="text-xs text-subdued">Quantidade de compras</p>
                  <p className="mt-1 font-semibold">{whatsappCustomer.purchaseCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="text-xs text-subdued">Total comprado</p>
                  <p className="mt-1 font-semibold">{formatCurrency(whatsappCustomer.totalSpent)}</p>
                </div>
              </div>

              {activeFilterLabels.length ? (
                <div className="mb-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700">
                  <strong>Cliente encontrado pelos filtros:</strong> {activeFilterLabels.join(" · ")}
                </div>
              ) : null}

              <div className="space-y-3">
                <Select
                  label="Tipo de mensagem"
                  help="A sugestão automática usa o histórico de compras do cliente."
                  value={whatsappMessageType}
                  onChange={(event) => changeWhatsAppMessageType(event.target.value as WhatsAppMessageType)}
                >
                  {WHATSAPP_MESSAGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Select>
                <label className="block text-sm font-medium text-ink">
                  Mensagem
                  <textarea
                    className="mt-1 min-h-44 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    value={whatsappMessage}
                    onChange={(event) => setWhatsappMessage(event.target.value)}
                  />
                </label>
                <p className="text-xs text-subdued">
                  Revise e altere a mensagem se quiser. O total gasto aparece somente para o funcionário e não é enviado ao cliente.
                </p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!whatsappMessage.trim() || !whatsappCustomer.whatsapp}
                  onClick={() => window.open(buildWhatsAppUrl(whatsappCustomer.whatsapp!, whatsappMessage), "_blank", "noopener,noreferrer")}
                >
                  <MessageCircle size={17} /> Abrir conversa no WhatsApp
                </Button>
                <p className="text-center text-xs text-subdued">A mensagem só será enviada quando você confirmar no WhatsApp.</p>
              </div>
            </Card>
          ) : null}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700">
                <UsersRound size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Filtro recomendado</h2>
                <p className="mt-1 text-sm text-subdued">
                  Comece por 60 dias sem compra, incluindo clientes que nunca compraram, e envie um cupom com validade curta.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Modal
        open={creatingCustomer || Boolean(editingCustomer)}
        className="erp-modal--customer"
        title={editingCustomer ? "Editar cliente" : "Cadastrar cliente"}
        description="Preencha os dados de contato e endereço do cliente."
        onClose={() => { setCreatingCustomer(false); setEditingCustomer(null); }}
      >
        <CustomerCreateForm
          customer={editingCustomer}
          onCancel={() => { setCreatingCustomer(false); setEditingCustomer(null); }}
          onSuccess={() => { setCreatingCustomer(false); setEditingCustomer(null); }}
        />
      </Modal>
    </div>
  );
}
