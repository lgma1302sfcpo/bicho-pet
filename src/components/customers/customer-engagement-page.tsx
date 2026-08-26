"use client";

import { Gift, Mail, MessageCircle, Pencil, Send, SlidersHorizontal, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import type { CustomerFiltersDTO, CustomerListItemDTO } from "@/dtos/commerce/customer.dto";
import { useCustomers, useDeleteCustomer, useSendCustomerEmail } from "@/hooks/commerce/use-commerce";
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

export function CustomerEngagementPage() {
  const [filters, setFilters] = useState<CustomerFiltersDTO>({
    inactiveDays: 60,
    includeNeverPurchased: true,
    contactableOnly: false
  });
  const customersQuery = useCustomers(filters);
  const deleteCustomer = useDeleteCustomer();
  const sendCustomerEmail = useSendCustomerEmail();
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItemDTO | null>(null);
  const [whatsappCustomer, setWhatsappCustomer] = useState<CustomerListItemDTO | null>(null);
  const [whatsappMessageType, setWhatsappMessageType] = useState<WhatsAppMessageType>("AUTOMATIC");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [emailCustomer, setEmailCustomer] = useState<CustomerListItemDTO | null>(null);
  const [emailSubject, setEmailSubject] = useState("Sentimos sua falta na Casa dos Bichos");
  const [emailMessage, setEmailMessage] = useState("Temos uma condicao especial para voce voltar esta semana.");
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const customers = customersQuery.data?.customers ?? [];
  const summary = customersQuery.data?.summary;
  const activeFilterLabels = [
    filters.search ? `Busca: ${filters.search}` : null,
    filters.inactiveDays ? `Sem comprar ha ${filters.inactiveDays} dias` : null,
    filters.contactableOnly ? "Somente com contato" : null,
    filters.minTotalSpent !== undefined ? `Gasto minimo: ${formatCurrency(filters.minTotalSpent)}` : null,
    filters.maxTotalSpent !== undefined ? `Gasto maximo: ${formatCurrency(filters.maxTotalSpent)}` : null,
    filters.birthdayMonth ? "Mes de aniversario" : null,
    filters.tag ? `Perfil: ${filters.tag}` : null,
    filters.status ? `Situacao: ${filters.status === "ACTIVE" ? "Ativo" : filters.status === "INACTIVE" ? "Inativo" : "Bloqueado"}` : null
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
    setFilters(nextFilters);
  }

  function prepareWhatsApp(customer: CustomerListItemDTO) {
    setWhatsappCustomer(customer);
    setWhatsappMessageType("AUTOMATIC");
    setWhatsappMessage(buildCustomerWhatsAppMessage(customer, "AUTOMATIC"));
    setEmailCustomer(null);
  }

  function changeWhatsAppMessageType(type: WhatsAppMessageType) {
    setWhatsappMessageType(type);
    if (whatsappCustomer) setWhatsappMessage(buildCustomerWhatsAppMessage(whatsappCustomer, type));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Clientes</h1>
          <p className="text-sm text-subdued">Filtros para reativar clientes que fazem tempo que nao compram.</p>
        </div>
        <Link href="/vendas/nova">
          <Button>
            <Gift size={18} />
            Cadastrar venda
          </Button>
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Clientes", summary?.totalCustomers ?? 0],
          ["Filtrados", summary?.totalFiltered ?? 0],
          ["Nunca compraram", summary?.neverPurchased ?? 0],
          ["Inativos ha 30 dias", summary?.inactive30 ?? 0],
          ["Inativos ha 90 dias", summary?.inactive90 ?? 0]
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-subdued">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand-700" />
              <h2 className="text-base font-semibold">Filtros de reativacao</h2>
              </div>
              <Button variant="ghost" onClick={() => setFilters({ includeNeverPurchased: true, contactableOnly: false })}>Limpar filtros</Button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => applyPreset({ inactiveDays: 60, includeNeverPurchased: true, contactableOnly: true })}
              >
                Sem comprar ha 60 dias
              </Button>
              <Button
                variant="secondary"
                onClick={() => applyPreset({ inactiveDays: 90, includeNeverPurchased: false, contactableOnly: true })}
              >
                Sem comprar ha 90 dias
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
                value={filters.search ?? ""}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
              <Select
                label="Sem comprar ha"
                value={String(filters.inactiveDays ?? "")}
                onChange={(event) =>
                  updateFilter("inactiveDays", event.target.value ? Number(event.target.value) : undefined)
                }
              >
                <option value="">Qualquer periodo</option>
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
                <option value="true">Com telefone/email</option>
              </Select>
              <Input
                label="Gasto minimo"
                help="Mostra somente clientes que ja gastaram pelo menos este valor."
                mask="currency"
                value={filters.minTotalSpent === undefined ? "" : formatCurrency(filters.minTotalSpent)}
                onChange={(event) =>
                  updateFilter("minTotalSpent", event.target.value ? Number(parseBrazilianNumber(event.target.value)) : undefined)
                }
              />
              <Input
                label="Gasto maximo"
                mask="currency"
                value={filters.maxTotalSpent === undefined ? "" : formatCurrency(filters.maxTotalSpent)}
                onChange={(event) =>
                  updateFilter("maxTotalSpent", event.target.value ? Number(parseBrazilianNumber(event.target.value)) : undefined)
                }
              />
              <Input
                label="Quantidade minima de compras"
                mask="integer"
                value={filters.minPurchaseCount ?? ""}
                onChange={(event) =>
                  updateFilter("minPurchaseCount", event.target.value ? Number(event.target.value) : undefined)
                }
              />
              <Input
                label="Quantidade maxima de compras"
                mask="integer"
                value={filters.maxPurchaseCount ?? ""}
                onChange={(event) =>
                  updateFilter("maxPurchaseCount", event.target.value ? Number(event.target.value) : undefined)
                }
              />
              <Select
                label="Aniversario"
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
              <Select label="Perfil do cliente" value={filters.tag ?? ""} onChange={(event) => updateFilter("tag", event.target.value || undefined)}><option value="">Todos os perfis</option><option>Cliente recorrente</option><option>Cliente de banho e tosa</option><option>Compra racao</option><option>Compra medicamentos</option><option>Tutor de filhote</option><option>Cliente com atendimento especial</option></Select>
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
              {activeFilterLabels.length ? <><strong>Filtros aplicados:</strong> {activeFilterLabels.join(" · ")}. Foram encontrados {customers.length} cliente(s).</> : <span>Nenhum filtro especifico aplicado. Exibindo todos os clientes.</span>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Clientes para campanha</h2>
                <p className="text-sm text-subdued">{campaignHint}</p>
              </div>
              <Badge className={activeFilterLabels.length ? "border-brand-200 bg-brand-50 text-brand-700" : ""}>{activeFilterLabels.length ? `Resultado filtrado: ${customers.length}` : `${customers.length} clientes`}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-subdued">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Ultima compra</th>
                    <th className="px-4 py-3">Compras</th>
                    <th className="px-4 py-3">Total gasto</th>
                    <th className="px-4 py-3">Acao</th>
                    <th className="px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{customer.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {customer.tags.map((tag) => (
                            <Badge key={tag} className="bg-white">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-subdued">
                        <div>{customer.whatsapp || customer.phone || "Sem telefone"}</div>
                        <div>{customer.email || "Sem email"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatDate(customer.lastPurchaseAt)}</div>
                        <div className="text-xs text-subdued">
                          {customer.daysSinceLastPurchase === null
                            ? "Sem historico"
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
                          {customer.email ? (
                            <Button variant="secondary" onClick={() => { setEmailCustomer(customer); setWhatsappCustomer(null); setEmailFeedback(null); }}>
                              <Mail size={16} /> Email
                            </Button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingCustomer(customer)} aria-label={`Editar ${customer.name}`}><Pencil size={16} />Editar</Button>
                          <Button variant="danger" disabled={deleteCustomer.isPending} onClick={async () => { if (window.confirm(`Excluir o cliente ${customer.name}? As vendas antigas serao mantidas.`)) { await deleteCustomer.mutateAsync(customer.id); if (editingCustomer?.id === customer.id) setEditingCustomer(null); } }} aria-label={`Excluir ${customer.name}`}><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-subdued" colSpan={7}>
                        Nenhum cliente encontrado para os filtros atuais.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
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

              {whatsappCustomer.tags.length ? (
                <div className="mb-4 flex flex-wrap gap-1">
                  {whatsappCustomer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
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
          {emailCustomer ? (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Enviar email</h2>
                  <p className="text-sm text-subdued">Para {emailCustomer.name} ({emailCustomer.email})</p>
                </div>
                <Button variant="ghost" onClick={() => setEmailCustomer(null)}>Fechar</Button>
              </div>
              <div className="space-y-3">
                <Input label="Assunto" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
                <label className="block text-sm font-medium text-ink">
                  Mensagem
                  <textarea
                    className="mt-1 min-h-32 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    value={emailMessage}
                    onChange={(event) => setEmailMessage(event.target.value)}
                  />
                </label>
                {emailFeedback ? <p className="text-sm text-subdued">{emailFeedback}</p> : null}
                <Button
                  className="w-full"
                  disabled={sendCustomerEmail.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Enviar este email para ${emailCustomer.email}?`)) return;
                    setEmailFeedback(null);
                    try {
                      await sendCustomerEmail.mutateAsync({ id: emailCustomer.id, subject: emailSubject, message: emailMessage });
                      setEmailFeedback("Email enviado com sucesso.");
                    } catch (error) {
                      setEmailFeedback(error instanceof Error ? error.message : "Nao foi possivel enviar o email.");
                    }
                  }}
                >
                  <Send size={16} /> Enviar email
                </Button>
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
          <CustomerCreateForm customer={editingCustomer} onCancel={() => setEditingCustomer(null)} />
        </div>
      </section>
    </div>
  );
}
