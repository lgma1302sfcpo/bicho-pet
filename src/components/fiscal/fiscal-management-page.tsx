"use client";

import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileKey2, Mail, RefreshCw, Save, Send, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFiscalAction, useFiscalOverview, useIssueFiscalDocument, useSaveFiscalConfiguration, useSefazStatus, useVoidFiscalNumber } from "@/hooks/use-fiscal";

const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const typeLabels: Record<string, string> = { NFE: "Nota Fiscal Eletrônica", NFCE: "Nota Fiscal de Consumidor Eletrônica", NFSE: "Nota Fiscal de Serviço Eletrônica" };
const statusLabels: Record<string, string> = { PROCESSING: "Processando", CONTINGENCY_PENDING: "Contingencia pendente", AUTHORIZED: "Autorizado", REJECTED: "Rejeitado", CANCELLED: "Cancelado", ERROR: "Erro" };
const initialConfig = {
  legalName: "", tradeName: "", cnpj: "", stateRegistration: "", municipalRegistration: "", taxRegime: "", cnae: "",
  street: "", number: "", complement: "", district: "", city: "", cityCode: "", state: "SP", zipCode: "", phone: "", email: "",
  environment: "HOMOLOGATION", provider: "SANDBOX", providerBaseUrl: "", providerToken: "", certificateType: "NONE",
  certificateExpiresAt: "", certificateName: "", certificateBase64: "", certificatePassword: "", nfceSecurityCodeId: "", nfceSecurityCode: "",
  enableNfe: false, enableNfce: true, enableNfse: false, autoEmail: false, directTransmissionEnabled: false, accountantApproved: false
};

function money(value: number) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function date(value?: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "Não informado"; }

export function FiscalManagementPage() {
  const overview = useFiscalOverview();
  const save = useSaveFiscalConfiguration();
  const issue = useIssueFiscalDocument();
  const action = useFiscalAction();
  const voidNumber = useVoidFiscalNumber();
  const sefazStatus = useSefazStatus();
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig);
  const [saleId, setSaleId] = useState("");
  const [documentType, setDocumentType] = useState("NFCE");
  const [series, setSeries] = useState(1);
  const [voidFrom, setVoidFrom] = useState(1);
  const [voidTo, setVoidTo] = useState(1);
  const [voidReason, setVoidReason] = useState("");
  const [contingency, setContingency] = useState(false);
  const [contingencyReason, setContingencyReason] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (overview.data?.configuration) {
      const source = overview.data.configuration;
      setConfig({ ...initialConfig, ...source, certificateExpiresAt: source.certificateExpiresAt ? String(source.certificateExpiresAt).slice(0, 10) : "", providerToken: "", certificateBase64: "", certificatePassword: "", nfceSecurityCode: "" });
    }
  }, [overview.data?.configuration]);

  const readiness = useMemo(() => ({
    company: [config.legalName, config.cnpj, config.stateRegistration, config.taxRegime, config.street, config.number, config.district, config.city, config.cityCode, config.state, config.zipCode].every(Boolean),
    accountant: Boolean(config.accountantApproved),
    safeEnvironment: config.environment === "HOMOLOGATION"
  }), [config]);

  function field(name: string, value: unknown) { setConfig((current) => ({ ...current, [name]: value })); }
  async function run(operation: () => Promise<unknown>, success: string) {
    setMessage(null);
    try { await operation(); setMessage({ kind: "success", text: success }); }
    catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível concluir." }); }
  }
  async function readCertificate(file?: File) {
    if (!file) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file);
    });
    setConfig((current) => ({ ...current, certificateBase64: base64, certificateName: file.name, certificateType: "A1" }));
  }
  async function checkSefaz() {
    setMessage(null);
    try {
      const result = await sefazStatus.mutateAsync(documentType === "NFE" ? "NFE" : "NFCE");
      setMessage({ kind: result.available ? "success" : "error", text: `Secretaria da Fazenda: ${result.message} (código ${result.code}).` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível consultar a Secretaria da Fazenda." });
    }
  }

  return <div className="erp-page">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold">Gestão fiscal</h1><p className="text-sm text-subdued">Configure, teste e acompanhe documentos fiscais sem misturar homologação com produção.</p></div>
      <div className="flex flex-wrap gap-2"><a className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium" href="/api/fiscal/backup"><DatabaseBackup size={18}/>Baixar backup</a>{config.provider === "DIRECT_SEFAZ_SP" ? <Button variant="secondary" disabled={sefazStatus.isPending} onClick={checkSefaz}><RefreshCw size={18}/>Testar Secretaria da Fazenda</Button> : null}<Button variant="secondary" onClick={() => overview.refetch()}><RefreshCw size={18}/>Atualizar</Button></div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard ready={readiness.company} title="Cadastro da empresa" readyText="Dados minimos preenchidos" pendingText="Dados obrigatorios pendentes" />
      <StatusCard ready={readiness.accountant} title="Validação contábil" readyText="Marcada como aprovada" pendingText="Aguardando o contador" />
      <StatusCard ready={readiness.safeEnvironment} title="Ambiente atual" readyText="Homologação, sem validade fiscal" pendingText={config.directTransmissionEnabled ? "Produção liberada conscientemente" : "Produção bloqueada"} />
    </div>
    {message ? <div className={`rounded-md border px-4 py-3 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-success" : "border-red-200 bg-red-50 text-danger"}`}>{message.text}</div> : null}

    <Card className="p-4">
      <div className="mb-4"><h2 className="font-semibold">Cadastro fiscal da empresa</h2><p className="text-sm text-subdued">Dados oficiais fornecidos pelo cliente e validados pelo contador.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <TextField name="legalName" label="Razão social" config={config} field={field}/><TextField name="tradeName" label="Nome fantasia" config={config} field={field}/>
        <Input label="Cadastro Nacional da Pessoa Juridica" mask="document" value={String(config.cnpj ?? "")} onChange={(event) => field("cnpj", event.target.value)}/>
        <TextField name="stateRegistration" label="Inscrição Estadual" config={config} field={field}/><TextField name="municipalRegistration" label="Inscrição Municipal" config={config} field={field}/>
        <Select label="Regime tributário" value={String(config.taxRegime ?? "")} onChange={(event) => field("taxRegime", event.target.value)}><option value="">Selecione</option><option value="MEI">Microempreendedor Individual</option><option value="SIMPLES_NACIONAL">Simples Nacional</option><option value="SIMPLES_EXCESS">Simples Nacional com excesso de sublimite</option><option value="NORMAL">Regime normal</option></Select>
        <Input label="Classificação Nacional de Atividades Econômicas" mask="integer" value={String(config.cnae ?? "")} onChange={(event) => field("cnae", event.target.value)}/>
        <TextField name="street" label="Endereço" config={config} field={field}/><TextField name="number" label="Número" config={config} field={field}/><TextField name="complement" label="Complemento" config={config} field={field}/><TextField name="district" label="Bairro" config={config} field={field}/><TextField name="city" label="Município" config={config} field={field}/>
        <Input label="Código do município" help="Código de sete números do Instituto Brasileiro de Geografia e Estatística." mask="integer" maxLength={7} value={String(config.cityCode ?? "")} onChange={(event) => field("cityCode", event.target.value)}/>
        <Select label="Estado" value={String(config.state ?? "")} onChange={(event) => field("state", event.target.value)}>{states.map((state) => <option key={state}>{state}</option>)}</Select>
        <Input label="Código de Endereçamento Postal" mask="integer" maxLength={8} value={String(config.zipCode ?? "")} onChange={(event) => field("zipCode", event.target.value)}/>
        <Input label="Telefone" mask="phone" value={String(config.phone ?? "")} onChange={(event) => field("phone", event.target.value)}/><Input label="Endereço de e-mail" type="email" value={String(config.email ?? "")} onChange={(event) => field("email", event.target.value)}/>
      </div>
    </Card>

    <Card className="p-4">
      <div className="mb-4"><h2 className="font-semibold">Emissão e segurança</h2><p className="text-sm text-subdued">Segredos novos são criptografados e os valores salvos nunca são exibidos novamente.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Ambiente" help="A homologação serve para testes e não gera documentos com validade fiscal." value={String(config.environment)} onChange={(event) => field("environment", event.target.value)}><option value="HOMOLOGATION">Homologação, sem validade fiscal</option><option value="PRODUCTION">Produção, com validade fiscal</option></Select>
        <Select label="Forma de transmissão" value={String(config.provider)} onChange={(event) => field("provider", event.target.value)}><option value="SANDBOX">Teste interno, sem transmissão</option><option value="DIRECT_SEFAZ_SP">Transmissão direta para a Secretaria da Fazenda de São Paulo</option><option value="EXTERNAL_API">Provedor fiscal externo</option><option value="NOT_CONFIGURED">Ainda não configurado</option></Select>
        {config.provider === "EXTERNAL_API" ? <><TextField name="providerBaseUrl" label="Endereço da interface do provedor" config={config} field={field}/><Input label="Nova chave de acesso do provedor" type="password" help="Deixe vazio para manter a chave já armazenada." value={String(config.providerToken ?? "")} onChange={(event) => field("providerToken", event.target.value)}/></> : null}
        <Select label="Tipo de certificado" value={String(config.certificateType)} onChange={(event) => field("certificateType", event.target.value)}><option value="NONE">Não configurado</option><option value="A1">Certificado digital do tipo A1</option><option value="A3">Certificado digital do tipo A3</option></Select>
        <Input label="Vencimento do certificado" type="date" value={String(config.certificateExpiresAt ?? "")} onChange={(event) => field("certificateExpiresAt", event.target.value)}/>
        <label className="block text-sm"><span className="mb-1 flex font-medium">Arquivo do certificado digital A1</span><input className="h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" type="file" accept=".pfx,.p12" onChange={(event) => readCertificate(event.target.files?.[0])}/></label>
        <Input label="Nova senha do certificado" type="password" value={String(config.certificatePassword ?? "")} onChange={(event) => field("certificatePassword", event.target.value)}/>
        {config.provider === "EXTERNAL_API" ? <><TextField name="nfceSecurityCodeId" label="Identificador do Código de Segurança do Contribuinte" config={config} field={field}/><Input label="Novo Código de Segurança do Contribuinte" type="password" value={String(config.nfceSecurityCode ?? "")} onChange={(event) => field("nfceSecurityCode", event.target.value)}/></> : <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 md:col-span-2"><strong>Código QR versão 3:</strong> a transmissão direta usa a assinatura do certificado A1. O Código de Segurança do Contribuinte não é exigido nesse formato atual.</div>}
        <BooleanSelect label="Nota Fiscal Eletrônica" name="enableNfe" config={config} field={field}/><BooleanSelect label="Nota Fiscal de Consumidor Eletrônica" name="enableNfce" config={config} field={field}/><BooleanSelect label="Nota Fiscal de Serviço Eletrônica" name="enableNfse" config={config} field={field}/><BooleanSelect label="Envio automático por e-mail" name="autoEmail" config={config} field={field}/>
        <BooleanSelect label="Liberação da transmissão direta em produção" name="directTransmissionEnabled" config={config} field={field} help="Mantenha bloqueada durante os testes. Ao habilitar em produção, os documentos transmitidos podem possuir validade jurídica." trueLabel="Liberada conscientemente" falseLabel="Bloqueada"/>
        <BooleanSelect label="Conferencia do contador" name="accountantApproved" config={config} field={field} help="Registre como aprovada somente depois de o contador conferir os dados." trueLabel="Dados conferidos pelo contador" falseLabel="Aguardando conferencia"/>
      </div>
      <Button className="mt-4" disabled={save.isPending} onClick={() => run(() => save.mutateAsync(config), "Configuração fiscal salva com segurança.")}><Save size={18}/>Salvar configuração</Button>
    </Card>

    {(overview.data?.sales ?? []).some((sale) => sale.fiscalPendingAt) ? <Card className="overflow-hidden border-amber-200">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3"><h2 className="font-semibold text-amber-950">NFC-e pendentes de correção</h2><p className="text-sm text-amber-900">Corrija os produtos indicados e tente emitir novamente. A venda, o estoque e o caixa já estão registrados.</p></div>
      <div className="divide-y divide-border">{(overview.data?.sales ?? []).filter((sale) => sale.fiscalPendingAt).map((sale) => <div key={sale.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{sale.code} · {money(sale.total)}</p><p className="mt-1 text-sm text-danger">{sale.fiscalPendingReason}</p><p className="mt-1 text-xs text-subdued">Pendente desde {date(sale.fiscalPendingAt)}</p></div><div className="flex flex-wrap gap-2"><a className="inline-flex h-10 items-center rounded-md border border-border bg-white px-3 text-sm font-medium" href="/produtos">Corrigir produtos</a><Button disabled={issue.isPending} onClick={() => run(() => issue.mutateAsync({ saleId: sale.id, type: "NFCE", series }), "NFC-e emitida após a correção.")}><RefreshCw size={16}/>Tentar emitir novamente</Button></div></div>)}</div>
    </Card> : null}

    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-4"><h2 className="font-semibold">Emitir a partir de uma venda</h2><p className="mb-4 text-sm text-subdued">No simulador, nada é transmitido. Na forma direta, o documento vai para a Secretaria da Fazenda no ambiente selecionado.</p><div className="grid gap-3 sm:grid-cols-3"><Select label="Venda concluída" value={saleId} onChange={(event) => setSaleId(event.target.value)}><option value="">Selecione</option>{(overview.data?.sales ?? []).map((sale) => <option key={sale.id} value={sale.id}>{sale.code} - {sale.customerName} - {money(sale.total)}</option>)}</Select><Select label="Tipo de documento" value={documentType} onChange={(event) => { setDocumentType(event.target.value); if (event.target.value !== "NFCE") setContingency(false); }}>{Object.entries(typeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</Select><Input label="Série" mask="integer" value={series} onChange={(event) => setSeries(Number(event.target.value || 1))}/>{config.provider === "DIRECT_SEFAZ_SP" && documentType === "NFCE" ? <Select label="Forma de emissão" help="Use a contingência somente quando o serviço fiscal estiver realmente indisponível. O documento deverá ser transmitido assim que o serviço voltar." value={contingency ? "OFFLINE" : "NORMAL"} onChange={(event) => setContingency(event.target.value === "OFFLINE")}><option value="NORMAL">Transmissão normal</option><option value="OFFLINE">Contingência offline</option></Select> : null}{contingency ? <Input label="Motivo da contingência" help="Explique a indisponibilidade com pelo menos quinze caracteres." value={contingencyReason} onChange={(event) => setContingencyReason(event.target.value)}/> : null}</div><Button className="mt-4" disabled={!saleId || issue.isPending || (contingency && contingencyReason.trim().length < 15)} onClick={() => run(() => issue.mutateAsync({ saleId, type: documentType, series, contingency, contingencyReason: contingency ? contingencyReason : undefined }), contingency ? "Documento assinado e guardado para transmissão assim que o serviço voltar." : config.environment === "HOMOLOGATION" ? "Documento processado em homologação." : "Documento transmitido em produção.")}><Send size={18}/>{contingency ? "Gerar em contingência" : config.environment === "HOMOLOGATION" ? "Emitir em homologação" : "Emitir em produção"}</Button></Card>
      <Card className="p-4"><h2 className="font-semibold">Próximas numerações</h2><div className="mt-3 space-y-2">{(overview.data?.sequences ?? []).map((sequence) => <div key={sequence.id} className="flex justify-between rounded-md border border-border p-3 text-sm"><span>{typeLabels[sequence.type]}<br/><span className="text-xs text-subdued">Série {sequence.series}</span></span><strong>{sequence.nextNumber}</strong></div>)}{!overview.data?.sequences.length ? <p className="text-sm text-subdued">Nenhuma sequência utilizada.</p> : null}</div><div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-semibold">Inutilizar intervalo</h3><div className="mt-2 grid grid-cols-2 gap-2"><Input label="Número inicial" mask="integer" value={voidFrom} onChange={(event) => setVoidFrom(Number(event.target.value || 1))}/><Input label="Número final" mask="integer" value={voidTo} onChange={(event) => setVoidTo(Number(event.target.value || 1))}/></div><Input className="mt-2" label="Motivo" value={voidReason} onChange={(event) => setVoidReason(event.target.value)}/><Button className="mt-2 w-full" variant="secondary" disabled={voidNumber.isPending || voidReason.length < 15 || documentType === "NFSE"} onClick={() => run(() => voidNumber.mutateAsync({ type: documentType, series, numberFrom: voidFrom, numberTo: voidTo, reason: voidReason }), config.provider === "DIRECT_SEFAZ_SP" ? "Numeração inutilizada pela Secretaria da Fazenda." : "Numeração inutilizada no simulador.")}>Inutilizar numeração</Button></div></Card>
    </section>

    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Documentos e histórico</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Venda</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Ambiente</th><th className="px-4 py-3">Último evento</th><th className="px-4 py-3">Ações</th></tr></thead>
        <tbody className="divide-y divide-border">{(overview.data?.documents ?? []).map((document) => <tr key={document.id}>
          <td className="px-4 py-3 font-medium">{typeLabels[document.type]}<br/><span className="text-xs text-subdued">Série {document.series}, número {document.number}</span></td>
          <td className="px-4 py-3">{document.sale.code}<br/><span className="text-xs text-subdued">{money(document.sale.total)}</span></td>
          <td className="px-4 py-3"><Badge className={document.status === "AUTHORIZED" ? "border-emerald-200 bg-emerald-50 text-success" : document.status === "CONTINGENCY_PENDING" ? "border-amber-200 bg-amber-50 text-amber-800" : document.status === "CANCELLED" ? "border-slate-300 bg-slate-100" : "border-red-200 bg-red-50 text-danger"}>{statusLabels[document.status] ?? document.status}</Badge>{document.rejectionReason ? <p className="mt-1 max-w-xs text-xs text-danger">{document.rejectionReason}</p> : null}</td>
          <td className="px-4 py-3">{document.environment === "HOMOLOGATION" ? "Homologação" : "Produção"}<br/><span className="text-xs text-subdued">{date(document.createdAt)}</span></td>
          <td className="max-w-xs px-4 py-3"><p>{document.events[0]?.message ?? "Sem eventos"}</p><span className="text-xs text-subdued">{date(document.events[0]?.createdAt)}</span></td>
          <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
            {document.hasPdf ? <a className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2" href={`/api/fiscal/documents/${document.id}/artifacts/pdf`}><Download size={15}/>Documento</a> : null}
            {document.hasXml ? <a className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2" href={`/api/fiscal/documents/${document.id}/artifacts/xml`}><FileKey2 size={15}/>XML</a> : null}
            {document.status !== "CONTINGENCY_PENDING" ? <Button variant="ghost" title="Consultar" onClick={() => run(() => action.mutateAsync({ id: document.id, action: "query" }), "Situação consultada.")}><RefreshCw size={15}/></Button> : null}
            {document.status === "CONTINGENCY_PENDING" ? <Button variant="secondary" title="Transmitir documento pendente" onClick={() => run(() => action.mutateAsync({ id: document.id, action: "transmit" }), "Documento pendente processado.")}><Send size={15}/>Transmitir</Button> : null}
            {document.status === "AUTHORIZED" ? <><Button variant="ghost" title="Enviar por e-mail" onClick={() => run(() => action.mutateAsync({ id: document.id, action: "email" }), "Documento enviado por e-mail.")}><Mail size={15}/></Button><Button variant="ghost" title="Cancelar" onClick={() => { const reason = window.prompt("Informe o motivo do cancelamento com pelo menos 15 caracteres:"); if (reason) run(() => action.mutateAsync({ id: document.id, action: "cancel", reason }), document.environment === "HOMOLOGATION" ? "Documento cancelado em homologação." : "Documento cancelado em produção."); }}><XCircle size={15}/></Button></> : null}
          </div></td>
        </tr>)}{overview.data?.documents.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-subdued">Nenhum documento fiscal processado.</td></tr> : null}</tbody>
      </table></div>
    </Card>
    {(overview.data?.numberVoids ?? []).length ? <Card className="overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Histórico de inutilizações</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-subdued"><tr><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Série</th><th className="px-4 py-3">Intervalo</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Data</th></tr></thead><tbody className="divide-y divide-border">{overview.data?.numberVoids.map((item) => <tr key={item.id}><td className="px-4 py-3">{typeLabels[item.type]}</td><td className="px-4 py-3">{item.series}</td><td className="px-4 py-3">{item.numberFrom} a {item.numberTo}</td><td className="px-4 py-3">{item.status === "VOIDED" ? "Inutilizado" : `Rejeitado: ${item.rejectionReason ?? "sem motivo"}`}</td><td className="px-4 py-3">{date(item.createdAt)}</td></tr>)}</tbody></table></div></Card> : null}
  </div>;
}

type FieldProps = { name: string; label: string; config: Record<string, unknown>; field: (name: string, value: unknown) => void; help?: string };
function TextField({ name, label, config, field, help }: FieldProps) { return <Input label={label} help={help} value={String(config[name] ?? "")} onChange={(event) => field(name, event.target.value)}/>; }
function BooleanSelect({ name, label, config, field, help, trueLabel = "Habilitada", falseLabel = "Desabilitada" }: FieldProps & { trueLabel?: string; falseLabel?: string }) { return <Select label={label} help={help} value={String(Boolean(config[name]))} onChange={(event) => field(name, event.target.value === "true")}><option value="false">{falseLabel}</option><option value="true">{trueLabel}</option></Select>; }
function StatusCard({ ready, title, readyText, pendingText }: { ready: boolean; title: string; readyText: string; pendingText: string }) { return <Card className="flex items-center gap-3 p-4">{ready ? <CheckCircle2 className="text-success"/> : <AlertTriangle className="text-amber-600"/>}<div><p className="font-semibold">{title}</p><p className="text-xs text-subdued">{ready ? readyText : pendingText}</p></div></Card>; }
