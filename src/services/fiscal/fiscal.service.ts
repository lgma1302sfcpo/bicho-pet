import type { FiscalDocumentType, Prisma } from "@prisma/client";

import type { FiscalProvider, FiscalProviderRequest } from "@/interfaces/fiscal/fiscal-provider.interface";
import type { EmailSender } from "@/interfaces/messaging/email-sender.interface";
import { AppError } from "@/lib/errors";
import { decryptFiscalSecret, encryptFiscalSecret } from "@/lib/fiscal-secrets";
import { prisma } from "@/lib/prisma";
import type { adjustFiscalSequenceSchema, cancelFiscalDocumentSchema, fiscalConfigurationSchema, issueFiscalDocumentSchema, replaceFiscalDocumentSchema, voidFiscalNumberSchema } from "@/schemas/fiscal/fiscal.schemas";
import type { z } from "zod";

import { SandboxFiscalProvider } from "./sandbox-fiscal-provider";
import { DirectSefazSpProvider } from "./direct/direct-sefaz-sp-provider";
import { extractA1Certificate } from "./direct/nfe-certificate";

type ConfigurationInput = z.infer<typeof fiscalConfigurationSchema>;
type IssueInput = z.infer<typeof issueFiscalDocumentSchema>;
type CancelInput = z.infer<typeof cancelFiscalDocumentSchema>;
type VoidInput = z.infer<typeof voidFiscalNumberSchema>;
type ReplaceInput = z.infer<typeof replaceFiscalDocumentSchema>;
type AdjustSequenceInput = z.infer<typeof adjustFiscalSequenceSchema>;
type FiscalConfigurationRecord = NonNullable<Awaited<ReturnType<typeof prisma.fiscalConfiguration.findUnique>>>;
type IssuableSale = Prisma.SaleGetPayload<{ include: { customer: true; user: true; payments: true; items: { include: { product: true } } } }>;
type FiscalDocumentRecord = Prisma.FiscalDocumentGetPayload<Record<string, never>>;

function number(value: Prisma.Decimal | number) {
  return Number(value);
}

function safeConfiguration(configuration: Awaited<ReturnType<typeof prisma.fiscalConfiguration.findUnique>>) {
  if (!configuration) return null;
  const {
    providerTokenEncrypted: _providerToken,
    certificateDataEncrypted: _certificateData,
    certificatePasswordEncrypted: _certificatePassword,
    nfceSecurityCodeEncrypted: _securityCode,
    ...safe
  } = configuration;
  let certificateUsable = false;
  if (_certificateData && _certificatePassword) {
    try {
      const certificateBase64 = decryptFiscalSecret(_certificateData);
      const certificatePassword = decryptFiscalSecret(_certificatePassword);
      extractA1Certificate(Buffer.from(certificateBase64, "base64"), certificatePassword);
      certificateUsable = true;
    } catch {
      certificateUsable = false;
    }
  }
  return {
    ...safe,
    hasProviderToken: Boolean(_providerToken),
    hasCertificate: Boolean(_certificateData),
    hasCertificatePassword: Boolean(_certificatePassword),
    certificateUsable,
    hasNfceSecurityCode: Boolean(_securityCode),
    accountantApproved: Boolean(configuration.accountantApprovedAt)
  };
}

export class FiscalService {
  constructor(private readonly emailSender?: EmailSender) {}

  async getOverview(tenantId: string, branchId: string | null = null) {
    const [configuration, selectedBranch, sequences, documents, numberVoids, sales] = await Promise.all([
      prisma.fiscalConfiguration.findUnique({ where: { tenantId } }),
      branchId ? prisma.branch.findFirst({ where: { id: branchId, tenantId }, select: { id: true, name: true, fiscalEmissionEnabled: true } }) : null,
      prisma.fiscalSequence.findMany({ where: { tenantId }, orderBy: [{ type: "asc" }, { series: "asc" }] }),
      prisma.fiscalDocument.findMany({
        where: { tenantId, archivedAt: null, ...(branchId ? { sale: { branchId } } : {}) },
        include: { sale: { select: { code: true, total: true, branch: { select: { name: true } }, customer: { select: { name: true, email: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 8 } },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.fiscalNumberVoid.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.sale.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}), status: "COMPLETED" },
        select: { id: true, code: true, total: true, soldAt: true, fiscalPendingAt: true, fiscalPendingReason: true, branch: { select: { name: true } }, customer: { select: { name: true } }, items: { select: { description: true, product: { select: { id: true, code: true, name: true } } } }, fiscalDocuments: { select: { type: true, status: true } } },
        orderBy: { soldAt: "desc" },
        take: 100
      })
    ]);

    return {
      configuration: safeConfiguration(configuration),
      selectedBranch,
      sequences,
      numberVoids: numberVoids.map((item) => ({ ...item, xmlContent: undefined, hasXml: Boolean(item.xmlContent) })),
      documents: documents.map((document) => ({
        ...document,
        pdfContent: undefined,
        xmlContent: undefined,
        hasXml: Boolean(document.xmlContent),
        hasPdf: Boolean(document.pdfContent),
        sale: { ...document.sale, total: number(document.sale.total) }
      })),
      sales: sales.map((sale) => ({ ...sale, branchName: sale.branch.name, total: number(sale.total), customerName: sale.customer?.name ?? "Consumidor final", products: sale.items.map((item) => ({ id: item.product?.id ?? null, code: item.product?.code ?? null, name: item.product?.name ?? item.description })) }))
    };
  }

  async saveConfiguration(tenantId: string, branchId: string, userId: string, input: ConfigurationInput) {
    const current = await prisma.fiscalConfiguration.findUnique({ where: { tenantId } });
    const secretData: Record<string, string> = {};
    if (input.providerToken) secretData.providerTokenEncrypted = encryptFiscalSecret(input.providerToken);
    if (input.certificateBase64) secretData.certificateDataEncrypted = encryptFiscalSecret(input.certificateBase64);
    if (input.certificatePassword) secretData.certificatePasswordEncrypted = encryptFiscalSecret(input.certificatePassword);
    if (input.nfceSecurityCode) secretData.nfceSecurityCodeEncrypted = encryptFiscalSecret(input.nfceSecurityCode);
    let certificateExpiresAt = input.certificateExpiresAt;
    const shouldValidateCertificate = input.certificateType === "A1" && (input.provider === "DIRECT_SEFAZ_SP" || Boolean(input.certificateBase64) || Boolean(input.certificatePassword));
    if (shouldValidateCertificate) {
      const certificateBase64 = input.certificateBase64 ?? (current?.certificateDataEncrypted ? decryptFiscalSecret(current.certificateDataEncrypted) : undefined);
      const certificatePassword = input.certificatePassword ?? (current?.certificatePasswordEncrypted ? decryptFiscalSecret(current.certificatePasswordEncrypted) : undefined);
      if (!certificateBase64 || !certificatePassword) throw new AppError("Envie o arquivo A1 e informe a senha para validar o certificado.", "FISCAL_CERTIFICATE_PAIR_REQUIRED", 422);
      let parsed;
      try {
        parsed = extractA1Certificate(Buffer.from(certificateBase64, "base64"), certificatePassword);
      } catch {
        throw new AppError("O certificado A1 armazenado não pode ser aberto com a senha armazenada. Selecione novamente o arquivo e digite novamente a senha.", "FISCAL_STORED_CERTIFICATE_INVALID", 422);
      }
      certificateExpiresAt = parsed.validTo;
    }

    const common = {
      legalName: input.legalName,
      tradeName: input.tradeName,
      cnpj: input.cnpj,
      stateRegistration: input.stateRegistration,
      municipalRegistration: input.municipalRegistration,
      taxRegime: input.taxRegime || null,
      cnae: input.cnae,
      street: input.street,
      number: input.number,
      complement: input.complement,
      district: input.district,
      city: input.city,
      cityCode: input.cityCode,
      state: input.state || null,
      zipCode: input.zipCode,
      phone: input.phone,
      email: input.email || null,
      environment: input.environment,
      provider: input.provider,
      providerBaseUrl: input.providerBaseUrl || null,
      certificateType: input.certificateType,
      certificateExpiresAt,
      certificateName: input.certificateName,
      nfceSecurityCodeId: input.nfceSecurityCodeId,
      enableNfe: input.enableNfe,
      enableNfce: input.enableNfce,
      enableNfse: input.enableNfse,
      autoEmail: input.autoEmail,
      directTransmissionEnabled: input.directTransmissionEnabled,
      accountantApprovedAt: input.accountantApproved ? new Date() : null,
      ...secretData
    };

    const saved = await prisma.$transaction(async (transaction) => {
      const configuration = await transaction.fiscalConfiguration.upsert({ where: { tenantId }, create: { tenantId, ...common }, update: common });
      await transaction.branch.updateMany({ where: { id: branchId, tenantId }, data: { fiscalEmissionEnabled: input.fiscalEmissionEnabled } });
      if (!input.fiscalEmissionEnabled) {
        await transaction.sale.updateMany({ where: { tenantId, branchId, fiscalPendingAt: { not: null } }, data: { fiscalPendingAt: null, fiscalPendingReason: null } });
      }
      return configuration;
    });
    await prisma.auditLog.create({ data: { tenantId, userId, action: "fiscal.configuration.updated", entity: "FiscalConfiguration", entityId: saved.id, metadata: { environment: saved.environment, provider: saved.provider } } });
    return safeConfiguration(saved);
  }

  async issue(tenantId: string, branchId: string, userId: string, input: IssueInput) {
    const configuration = await prisma.fiscalConfiguration.findUnique({ where: { tenantId } });
    if (!configuration) throw new AppError("Preencha a configuração fiscal antes da emissão.", "FISCAL_CONFIGURATION_MISSING", 422);
    if (configuration.environment === "PRODUCTION" && (configuration.provider !== "DIRECT_SEFAZ_SP" || !configuration.directTransmissionEnabled)) {
      throw new AppError("A produção permanece bloqueada até selecionar a transmissão direta e confirmar conscientemente a liberação.", "FISCAL_PRODUCTION_BLOCKED", 422);
    }
    if (configuration.provider === "SANDBOX" && configuration.environment !== "HOMOLOGATION") throw new AppError("O simulador interno funciona somente em homologação.", "FISCAL_SANDBOX_ENVIRONMENT_INVALID", 422);
    if (input.contingency && configuration.provider !== "DIRECT_SEFAZ_SP") throw new AppError("A contingência offline exige a transmissão direta para a Secretaria da Fazenda.", "FISCAL_CONTINGENCY_DIRECT_REQUIRED", 422);
    if (configuration.provider === "DIRECT_SEFAZ_SP" && input.type === "NFSE") throw new AppError("A Nota Fiscal de Serviço Eletrônica depende da prefeitura do município, que ainda não foi informado.", "FISCAL_NFSE_MUNICIPAL_CONFIGURATION_REQUIRED", 422);
    if (configuration.provider !== "SANDBOX" && configuration.provider !== "DIRECT_SEFAZ_SP") throw new AppError("Selecione o simulador ou a transmissão direta para a Secretaria da Fazenda de São Paulo.", "FISCAL_PROVIDER_NOT_READY", 422);

    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, tenantId, branchId, status: "COMPLETED" },
      include: { customer: true, user: true, payments: true, items: { include: { product: true } } }
    });
    if (!sale) throw new AppError("Venda concluída não encontrada.", "SALE_NOT_FOUND", 404);
    this.validateForIssue(configuration, sale, input.type);

    const existing = await prisma.fiscalDocument.findUnique({ where: { tenantId_saleId_type: { tenantId, saleId: sale.id, type: input.type } } });
    if (existing?.status === "AUTHORIZED" || existing?.status === "PROCESSING" || existing?.status === "CONTINGENCY_PENDING") {
      throw new AppError("Esta venda já possui uma emissão deste tipo. Consulte o documento existente para evitar duplicidade.", "DUPLICATE_FISCAL_DOCUMENT", 409);
    }

    const activeSequence = await prisma.fiscalSequence.findUnique({
      where: { tenantId_type_environment_series: { tenantId, type: input.type, environment: configuration.environment, series: input.series } }
    });
    const sequenceMovedPastDocument = existing && activeSequence && activeSequence.nextNumber > existing.number + 1;
    const requiresNewNumber = existing && (existing.environment !== configuration.environment || existing.series !== input.series || existing.provider !== configuration.provider || sequenceMovedPastDocument);
    const document = requiresNewNumber ? await prisma.$transaction(async (transaction) => {
      const sequence = await transaction.fiscalSequence.upsert({
        where: { tenantId_type_environment_series: { tenantId, type: input.type, environment: configuration.environment, series: input.series } },
        create: { tenantId, type: input.type, environment: configuration.environment, series: input.series, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } }
      });
      return transaction.fiscalDocument.update({
        where: { id: existing.id },
        data: {
          environment: configuration.environment,
          provider: configuration.provider,
          series: input.series,
          number: sequence.nextNumber - 1,
          status: "PROCESSING",
          providerId: null,
          accessKey: null,
          protocol: null,
          rejectionCode: null,
          rejectionReason: null,
          xmlContent: null,
          pdfContent: null,
          authorizedAt: null,
          cancelledAt: null,
          cancellationProtocol: null,
          cancellationXmlContent: null,
          archivedAt: null
        }
      });
    }) : existing ? await prisma.fiscalDocument.update({
      where: { id: existing.id },
      data: { status: "PROCESSING", rejectionCode: null, rejectionReason: null, archivedAt: null }
    }) : await prisma.$transaction(async (transaction) => {
      const sequence = await transaction.fiscalSequence.upsert({
        where: { tenantId_type_environment_series: { tenantId, type: input.type, environment: configuration.environment, series: input.series } },
        create: { tenantId, type: input.type, environment: configuration.environment, series: input.series, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } }
      });
      const reservedNumber = sequence.nextNumber - 1;
      return transaction.fiscalDocument.create({ data: { tenantId, saleId: sale.id, type: input.type, environment: configuration.environment, provider: configuration.provider, series: input.series, number: reservedNumber, createdById: userId } });
    });

    await this.event(tenantId, document.id, userId, "ISSUE", true, input.contingency ? "Documento gerado em contingência offline e mantido pendente de transmissão." : configuration.provider === "SANDBOX" ? "Emissão enviada ao simulador interno de homologação." : "Emissão enviada diretamente para a Secretaria da Fazenda de São Paulo.");
    try {
      const provider = this.provider(configuration);
      const request = this.providerRequest(configuration, sale, document, input);
      const result = await provider.issue(request);
      const updated = await prisma.fiscalDocument.update({
        where: { id: document.id },
        data: {
          status: result.status,
          providerId: result.providerId,
          accessKey: result.accessKey,
          protocol: result.protocol,
          rejectionCode: result.rejectionCode,
          rejectionReason: result.rejectionReason,
          xmlContent: result.xml,
          pdfContent: result.pdf ? Buffer.from(result.pdf) : undefined,
          authorizedAt: result.status === "AUTHORIZED" ? new Date() : null
        }
      });
      if (result.status === "AUTHORIZED" || result.status === "CONTINGENCY_PENDING") {
        await prisma.sale.update({ where: { id: sale.id }, data: { fiscalPendingAt: null, fiscalPendingReason: null } });
      }
      const successful = result.status === "AUTHORIZED" || result.status === "CONTINGENCY_PENDING";
      const message = result.status === "AUTHORIZED"
        ? configuration.environment === "HOMOLOGATION" ? "Documento autorizado pela Secretaria da Fazenda em homologação, sem validade fiscal." : "Documento autorizado pela Secretaria da Fazenda em produção."
        : result.status === "CONTINGENCY_PENDING" ? "Documento assinado em contingência offline e pendente de transmissão para a Secretaria da Fazenda." : result.rejectionReason ?? "Documento rejeitado.";
      await this.event(tenantId, document.id, userId, "ISSUE", successful, message);
      if (result.status === "AUTHORIZED" && configuration.autoEmail && sale.customer?.email) {
        await this.emailDocument(tenantId, userId, updated.id).catch(async (error) => {
          await this.event(tenantId, updated.id, userId, "EMAIL", false, error instanceof Error ? error.message : "Falha ao enviar o documento por e-mail.");
        });
      }
      return updated;
    } catch (error) {
      await prisma.fiscalDocument.update({ where: { id: document.id }, data: { status: "ERROR", rejectionReason: error instanceof Error ? error.message : "Falha inesperada no provedor." } });
      await this.event(tenantId, document.id, userId, "ISSUE", false, error instanceof Error ? error.message : "Falha inesperada no provedor.");
      throw error;
    }
  }

  async query(tenantId: string, userId: string, id: string) {
    const document = await this.document(tenantId, id);
    if (!document.providerId) throw new AppError("O documento ainda não possui identificador no provedor.", "FISCAL_PROVIDER_ID_MISSING", 422);
    const configuration = await this.configuration(tenantId);
    const result = await this.provider(configuration, document.provider, document.environment).query(document.providerId);
    await this.event(tenantId, id, userId, "QUERY", result.status !== "REJECTED", `Consulta concluída: ${result.status}. ${result.rejectionReason ?? ""}`.trim());
    return prisma.fiscalDocument.update({ where: { id }, data: { status: result.status, protocol: result.protocol || undefined, rejectionCode: result.rejectionCode || null, rejectionReason: result.rejectionReason || null } });
  }

  async archiveFailedDocument(tenantId: string, userId: string, id: string, reason: string) {
    const document = await prisma.fiscalDocument.findFirst({ where: { id, tenantId } });
    if (!document) throw new AppError("Documento fiscal não encontrado.", "FISCAL_DOCUMENT_NOT_FOUND", 404);
    if (document.status !== "ERROR" && document.status !== "REJECTED") {
      throw new AppError("Somente notas com erro ou rejeitadas podem ser removidas da lista.", "FISCAL_DOCUMENT_NOT_ARCHIVABLE", 422);
    }
    const updated = await prisma.$transaction(async (transaction) => {
      const archived = await transaction.fiscalDocument.update({ where: { id }, data: { archivedAt: new Date() } });
      await transaction.auditLog.create({ data: { tenantId, userId, action: "fiscal.document.archived", entity: "FiscalDocument", entityId: id, metadata: { status: document.status, type: document.type, series: document.series, number: document.number, reason } } });
      return archived;
    });
    return { id: updated.id, archived: true };
  }

  async cancel(tenantId: string, userId: string, id: string, input: CancelInput) {
    const document = await this.document(tenantId, id);
    if (document.status !== "AUTHORIZED" || !document.providerId) throw new AppError("Somente um documento autorizado pode ser cancelado.", "FISCAL_DOCUMENT_NOT_AUTHORIZED", 422);
    const configuration = await this.configuration(tenantId);
    try {
      const result = await this.provider(configuration, document.provider, document.environment).cancel(document.providerId, input.reason, document.protocol ?? undefined);
      const updated = await prisma.fiscalDocument.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationProtocol: result.protocol, cancellationXmlContent: result.xml } });
      await this.event(tenantId, id, userId, "CANCEL", true, `Cancelamento autorizado ${document.environment === "HOMOLOGATION" ? "em homologação" : "em produção"}. Protocolo: ${result.protocol}. Motivo: ${input.reason}`);
      await prisma.auditLog.create({ data: { tenantId, userId, action: "fiscal.document.cancelled", entity: "FiscalDocument", entityId: id, metadata: { reason: input.reason, protocol: result.protocol, environment: document.environment } } });
      return updated;
    } catch (error) {
      await this.event(tenantId, id, userId, "CANCEL", false, error instanceof Error ? error.message : "Não foi possível cancelar o documento na Secretaria da Fazenda.", { reason: input.reason, environment: document.environment });
      throw error;
    }
  }

  async adjustSequence(tenantId: string, userId: string, input: AdjustSequenceInput) {
    const configuration = await this.configuration(tenantId);
    const latestLocalDocument = await prisma.fiscalDocument.aggregate({
      where: { tenantId, type: input.type, environment: configuration.environment, series: input.series },
      _max: { number: true }
    });
    if (latestLocalDocument._max.number && input.nextNumber <= latestLocalDocument._max.number) {
      throw new AppError(`A próxima numeração deve ser maior que ${latestLocalDocument._max.number}, que já foi utilizada neste sistema.`, "FISCAL_SEQUENCE_TOO_LOW", 422);
    }
    const sequence = await prisma.fiscalSequence.upsert({
      where: { tenantId_type_environment_series: { tenantId, type: input.type, environment: configuration.environment, series: input.series } },
      create: { tenantId, type: input.type, environment: configuration.environment, series: input.series, nextNumber: input.nextNumber },
      update: { nextNumber: input.nextNumber }
    });
    await prisma.auditLog.create({ data: { tenantId, userId, action: "fiscal.sequence.adjusted", entity: "FiscalSequence", entityId: sequence.id, metadata: { type: input.type, environment: configuration.environment, series: input.series, nextNumber: input.nextNumber } } });
    return sequence;
  }

  async dismissPendingSale(tenantId: string, branchId: string, userId: string, saleId: string, reason: string) {
    const sale = await prisma.sale.findFirst({ where: { id: saleId, tenantId, branchId }, select: { id: true, code: true, fiscalPendingAt: true, fiscalPendingReason: true } });
    if (!sale) throw new AppError("Venda não encontrada nesta loja.", "SALE_NOT_FOUND", 404);
    if (!sale.fiscalPendingAt) throw new AppError("Esta venda não possui uma pendência fiscal ativa.", "FISCAL_PENDING_NOT_FOUND", 422);
    await prisma.$transaction([
      prisma.sale.update({ where: { id: sale.id }, data: { fiscalPendingAt: null, fiscalPendingReason: null } }),
      prisma.auditLog.create({ data: { tenantId, userId, action: "fiscal.pending.dismissed", entity: "Sale", entityId: sale.id, metadata: { saleCode: sale.code, reason, previousReason: sale.fiscalPendingReason } } })
    ]);
    return { saleId: sale.id, dismissed: true };
  }

  async voidNumber(tenantId: string, userId: string, input: VoidInput) {
    const configuration = await this.configuration(tenantId);
    if (input.type === "NFSE") throw new AppError("A inutilização estadual aceita apenas Nota Fiscal Eletrônica e Nota Fiscal de Consumidor Eletrônica.", "FISCAL_VOID_MODEL_UNSUPPORTED", 422);
    const used = await prisma.fiscalDocument.count({ where: { tenantId, type: input.type, environment: configuration.environment, series: input.series, number: { gte: input.numberFrom, lte: input.numberTo } } });
    if (used) throw new AppError("O intervalo possui um número já usado por um documento fiscal.", "FISCAL_VOID_RANGE_USED", 409);
    const provider = this.provider(configuration);
    const result = configuration.provider === "SANDBOX"
      ? { status: "VOIDED" as const, protocol: `INUTILIZACAO-HOMOLOGACAO-${Date.now()}`, xml: `<?xml version="1.0" encoding="UTF-8"?><inutilizacaoDeTeste semValidadeFiscal="true"><inicio>${input.numberFrom}</inicio><fim>${input.numberTo}</fim></inutilizacaoDeTeste>` }
      : provider.voidNumber ? await provider.voidNumber({ type: input.type, environment: configuration.environment, cnpj: configuration.cnpj!, stateCode: "35", year: new Date().getFullYear(), series: input.series, numberFrom: input.numberFrom, numberTo: input.numberTo, reason: input.reason })
        : { status: "REJECTED" as const, rejectionCode: "NOT_IMPLEMENTED", rejectionReason: "A forma de transmissão selecionada não oferece inutilização." };
    const record = await prisma.fiscalNumberVoid.create({ data: { tenantId, type: input.type, environment: configuration.environment, provider: configuration.provider, series: input.series, numberFrom: input.numberFrom, numberTo: input.numberTo, reason: input.reason, status: result.status, protocol: result.protocol, rejectionCode: result.rejectionCode, rejectionReason: result.rejectionReason, xmlContent: result.xml, createdById: userId } });
    if (result.status === "REJECTED") {
      await this.event(tenantId, null, userId, "VOID_NUMBER", false, `Inutilização rejeitada: ${result.rejectionReason ?? result.rejectionCode}.`, { ...input, recordId: record.id });
      throw new AppError(`Inutilização rejeitada: ${result.rejectionReason ?? "sem motivo informado"}.`, "FISCAL_VOID_REJECTED", 422, result);
    }
    const key = { tenantId_type_environment_series: { tenantId, type: input.type, environment: configuration.environment, series: input.series } };
    const current = await prisma.fiscalSequence.findUnique({ where: key });
    const sequence = await prisma.fiscalSequence.upsert({ where: key, create: { tenantId, type: input.type, environment: configuration.environment, series: input.series, nextNumber: input.numberTo + 1 }, update: { nextNumber: Math.max(current?.nextNumber ?? 1, input.numberTo + 1) } });
    await this.event(tenantId, null, userId, "VOID_NUMBER", true, `Numeração ${input.numberFrom} a ${input.numberTo} inutilizada ${configuration.provider === "SANDBOX" ? "no simulador" : "pela Secretaria da Fazenda"}.`, { ...input, protocol: result.protocol, recordId: record.id });
    return { sequence, record };
  }

  async replaceNfse(tenantId: string, userId: string, id: string, input: ReplaceInput) {
    const original = await this.document(tenantId, id);
    if (original.type !== "NFSE" || original.status !== "AUTHORIZED") throw new AppError("Somente uma Nota Fiscal de Serviço Eletrônica autorizada pode ser substituída.", "FISCAL_REPLACEMENT_NOT_ALLOWED", 422);
    if (original.environment !== "HOMOLOGATION" || original.provider !== "SANDBOX") throw new AppError("A substituição real depende das regras e da interface do provedor escolhido.", "FISCAL_REPLACEMENT_PROVIDER_REQUIRED", 422);
    const replacementSale = await prisma.sale.findFirst({ where: { id: input.replacementSaleId, tenantId }, select: { branchId: true } });
    if (!replacementSale) throw new AppError("Venda substituta não encontrada.", "SALE_NOT_FOUND", 404);
    const replacement = await this.issue(tenantId, replacementSale.branchId, userId, { saleId: input.replacementSaleId, type: "NFSE", series: input.series, contingency: false });
    await prisma.fiscalDocument.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await this.event(tenantId, id, userId, "REPLACE", true, `Documento substituído em homologação por ${replacement.id}. Motivo: ${input.reason}`, { replacementDocumentId: replacement.id });
    await this.event(tenantId, replacement.id, userId, "REPLACE", true, `Documento substituto de ${id}.`, { originalDocumentId: id });
    return replacement;
  }

  async serviceStatus(tenantId: string, type: "NFE" | "NFCE") {
    const configuration = await this.configuration(tenantId);
    if (configuration.provider !== "DIRECT_SEFAZ_SP") throw new AppError("Selecione a transmissão direta e configure o certificado A1 para consultar a Secretaria da Fazenda.", "FISCAL_DIRECT_PROVIDER_REQUIRED", 422);
    const provider = this.provider(configuration);
    if (!provider.serviceStatus) throw new AppError("Consulta de disponibilidade não suportada.", "FISCAL_STATUS_UNAVAILABLE", 422);
    return provider.serviceStatus(type, configuration.environment);
  }

  async transmitContingency(tenantId: string, userId: string, id: string) {
    const document = await prisma.fiscalDocument.findFirst({ where: { id, tenantId }, include: { sale: { include: { customer: true, user: true, payments: true, items: { include: { product: true } } } } } });
    if (!document || document.status !== "CONTINGENCY_PENDING" || !document.xmlContent || !document.providerId) throw new AppError("Documento de contingência pendente não encontrado.", "FISCAL_CONTINGENCY_NOT_PENDING", 422);
    const configuration = await this.configuration(tenantId);
    if (document.provider !== "DIRECT_SEFAZ_SP" || configuration.provider !== "DIRECT_SEFAZ_SP") throw new AppError("A retransmissão da contingência exige a conexão direta configurada.", "FISCAL_DIRECT_PROVIDER_REQUIRED", 422);
    const provider = this.provider(configuration);
    if (!provider.transmitPending) throw new AppError("A forma de transmissão não aceita documentos pendentes.", "FISCAL_CONTINGENCY_TRANSMISSION_UNAVAILABLE", 422);
    const request = this.providerRequest(configuration, document.sale, document, { saleId: document.saleId, type: document.type, series: document.series, contingency: false });
    try {
      const result = await provider.transmitPending(request, document.xmlContent, document.providerId);
      const authorized = result.status === "AUTHORIZED";
      const updated = await prisma.fiscalDocument.update({ where: { id }, data: authorized ? {
        status: "AUTHORIZED", protocol: result.protocol, accessKey: result.accessKey, xmlContent: result.xml, pdfContent: result.pdf ? Buffer.from(result.pdf) : undefined, authorizedAt: new Date(), rejectionCode: null, rejectionReason: null
      } : {
        status: "CONTINGENCY_PENDING", rejectionCode: result.rejectionCode, rejectionReason: result.rejectionReason
      } });
      await this.event(tenantId, id, userId, "RETRY", authorized, authorized ? "Documento de contingência autorizado pela Secretaria da Fazenda." : `Documento de contingência ainda pendente: ${result.rejectionReason ?? result.rejectionCode}.`);
      return updated;
    } catch (error) {
      await this.event(tenantId, id, userId, "RETRY", false, error instanceof Error ? error.message : "Falha ao transmitir o documento de contingência.");
      throw error;
    }
  }

  async backup(tenantId: string) {
    const [configuration, sequences, documents, events, numberVoids] = await Promise.all([
      prisma.fiscalConfiguration.findUnique({ where: { tenantId } }),
      prisma.fiscalSequence.findMany({ where: { tenantId } }),
      prisma.fiscalDocument.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      prisma.fiscalEvent.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } })
      ,prisma.fiscalNumberVoid.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } })
    ]);
    return {
      generatedAt: new Date().toISOString(),
      formatVersion: 1,
      configuration: safeConfiguration(configuration),
      sequences,
      documents: documents.map((document) => ({ ...document, pdfContent: document.pdfContent ? Buffer.from(document.pdfContent).toString("base64") : null })),
      events,
      numberVoids
    };
  }

  async emailDocument(tenantId: string, userId: string, id: string) {
    const document = await prisma.fiscalDocument.findFirst({ where: { id, tenantId }, include: { sale: { include: { customer: true } } } });
    if (!document || document.status !== "AUTHORIZED") throw new AppError("Documento fiscal autorizado não encontrado.", "FISCAL_DOCUMENT_NOT_AUTHORIZED", 422);
    if (!document.sale.customer?.email) throw new AppError("O cliente da venda não possui endereço de e-mail.", "CUSTOMER_WITHOUT_EMAIL", 422);
    if (!this.emailSender) throw new AppError("O serviço de e-mail não está configurado.", "EMAIL_NOT_CONFIGURED", 503);
    await this.emailSender.send({
      to: document.sale.customer.email,
      subject: `${document.type} da venda ${document.sale.code}`,
      text: "Segue o documento fiscal e o arquivo XML. O documento é de homologação quando indicado no anexo.",
      html: "<p>Segue o documento fiscal e o arquivo XML.</p><p>Verifique no anexo se o documento pertence ao ambiente de homologação.</p>",
      idempotencyKey: `fiscal-${document.id}-${document.updatedAt.getTime()}`,
      attachments: [
        ...(document.pdfContent ? [{ filename: `${document.type}-${document.number}.pdf`, content: Buffer.from(document.pdfContent).toString("base64") }] : []),
        ...(document.xmlContent ? [{ filename: `${document.type}-${document.number}.xml`, content: Buffer.from(document.xmlContent).toString("base64") }] : [])
      ]
    });
    const updated = await prisma.fiscalDocument.update({ where: { id }, data: { emailedAt: new Date() } });
    await this.event(tenantId, id, userId, "EMAIL", true, `Documento enviado para ${document.sale.customer.email}.`);
    return updated;
  }

  async artifact(tenantId: string, id: string, format: "xml" | "pdf") {
    const document = await prisma.fiscalDocument.findFirst({ where: { id, tenantId } });
    if (!document) throw new AppError("Documento fiscal não encontrado.", "FISCAL_DOCUMENT_NOT_FOUND", 404);
    const content = format === "xml" ? document.xmlContent : document.pdfContent;
    if (!content) throw new AppError("O arquivo ainda não está disponível.", "FISCAL_ARTIFACT_NOT_FOUND", 404);
    return { content, filename: `${document.type}-${document.series}-${document.number}.${format}` };
  }

  private validateForIssue(configuration: FiscalConfigurationRecord, sale: IssuableSale, type: FiscalDocumentType) {
    const missing = [!configuration.legalName && "razão social", !configuration.cnpj && "Cadastro Nacional da Pessoa Jurídica", !configuration.stateRegistration && "Inscrição Estadual", !configuration.street && "logradouro", !configuration.number && "número do endereço", !configuration.district && "bairro", !configuration.city && "município", !configuration.cityCode && "código do município", !configuration.state && "estado", !configuration.zipCode && "Código de Endereçamento Postal", !configuration.taxRegime && "regime tributário"].filter(Boolean);
    if (missing.length) throw new AppError(`Configuração fiscal incompleta: ${missing.join(", ")}.`, "FISCAL_CONFIGURATION_INCOMPLETE", 422);
    if (!configuration.accountantApprovedAt) throw new AppError("O contador ainda não aprovou a configuração fiscal.", "FISCAL_ACCOUNTANT_APPROVAL_REQUIRED", 422);
    if ((type === "NFE" && !configuration.enableNfe) || (type === "NFCE" && !configuration.enableNfce) || (type === "NFSE" && !configuration.enableNfse)) throw new AppError("Este tipo de documento não está habilitado.", "FISCAL_DOCUMENT_TYPE_DISABLED", 422);
    if (configuration.provider === "DIRECT_SEFAZ_SP") {
      if (configuration.state !== "SP") throw new AppError("A integração direta implementada nesta etapa atende somente empresas inscritas em São Paulo.", "FISCAL_DIRECT_STATE_UNSUPPORTED", 422);
      if (configuration.certificateType !== "A1" || !configuration.certificateDataEncrypted || !configuration.certificatePasswordEncrypted) throw new AppError("Envie o certificado digital A1 e informe a senha antes de transmitir diretamente.", "FISCAL_A1_REQUIRED", 422);
      if (configuration.taxRegime !== "SIMPLES_NACIONAL" && configuration.taxRegime !== "MEI") throw new AppError("O cálculo direto atual está limitado ao Simples Nacional. Regimes com excesso de sublimite ou regime normal precisam de regras próprias de ICMS.", "FISCAL_TAX_REGIME_NOT_IMPLEMENTED", 422);
    }
    if (type === "NFE") {
      const customer = sale.customer;
      const customerMissing = [!customer?.document && "documento", !customer?.street && "logradouro", !customer?.addressNumber && "número", !customer?.district && "bairro", !customer?.city && "município", !customer?.cityCode && "código do município", !customer?.state && "estado", !customer?.zipCode && "Código de Endereçamento Postal"].filter(Boolean);
      if (customerMissing.length) throw new AppError(`Cadastro fiscal do cliente incompleto para Nota Fiscal Eletrônica: ${customerMissing.join(", ")}.`, "FISCAL_CUSTOMER_INCOMPLETE", 422);
    }
    for (const item of sale.items) {
      if (!item.product) throw new AppError(`O item ${item.description} não está vinculado a um produto cadastrado.`, "FISCAL_ITEM_WITHOUT_PRODUCT", 422);
      if (type === "NFSE") {
        const missing = [item.product.fiscalItemType !== "SERVICE" && "tipo serviço", !item.product.serviceCode && "código do serviço", item.product.issRate === null && "alíquota de ISS", !item.product.fiscalApproved && "aprovação do contador"].filter(Boolean);
        if (missing.length) throw new AppError(`${item.product.name}: preencher ${missing.join(", ")}.`, "FISCAL_SERVICE_DATA_MISSING", 422);
      } else {
        const missing = [item.product.fiscalItemType !== "GOOD" && "tipo mercadoria", !item.product.unit && "unidade de medida", !item.product.ncm && "NCM", !item.product.defaultCfop && "CFOP"].filter(Boolean);
        if (missing.length) throw new AppError(`${item.product.name}: preencher ${missing.join(", ")}.`, "FISCAL_PRODUCT_DATA_MISSING", 422);
      }
    }
  }

  private provider(configuration: FiscalConfigurationRecord, providerOverride?: string, environmentOverride?: "HOMOLOGATION" | "PRODUCTION"): FiscalProvider {
    const provider = providerOverride ?? configuration.provider;
    if (provider === "SANDBOX") return new SandboxFiscalProvider();
    if (provider === "DIRECT_SEFAZ_SP") {
      if (!configuration.cnpj || !configuration.certificateDataEncrypted || !configuration.certificatePasswordEncrypted) throw new AppError("O certificado A1 e o Cadastro Nacional da Pessoa Jurídica são obrigatórios para a conexão direta.", "FISCAL_A1_REQUIRED", 422);
      const certificateBase64 = decryptFiscalSecret(configuration.certificateDataEncrypted);
      const password = decryptFiscalSecret(configuration.certificatePasswordEncrypted);
      const pfx = Buffer.from(certificateBase64, "base64");
      if (!pfx.length) throw new AppError("O arquivo do certificado A1 está vazio.", "FISCAL_CERTIFICATE_INVALID", 422);
      return new DirectSefazSpProvider({ pfx, password, cnpj: configuration.cnpj, environment: environmentOverride ?? configuration.environment });
    }
    throw new AppError("Forma de transmissão fiscal não configurada.", "FISCAL_PROVIDER_NOT_READY", 503);
  }

  private providerRequest(configuration: FiscalConfigurationRecord, sale: IssuableSale, document: FiscalDocumentRecord, input: IssueInput): FiscalProviderRequest {
    return {
      documentId: document.id,
      type: document.type,
      series: document.series,
      number: document.number,
      environment: document.environment,
      contingency: input.contingency ? { mode: "OFFLINE", startedAt: new Date(), reason: input.contingencyReason! } : undefined,
      issuer: {
        legalName: configuration.legalName!, tradeName: configuration.tradeName, cnpj: configuration.cnpj!, stateRegistration: configuration.stateRegistration!, taxRegime: configuration.taxRegime!,
        street: configuration.street!, number: configuration.number!, complement: configuration.complement, district: configuration.district!, city: configuration.city!, cityCode: configuration.cityCode!, state: configuration.state!, zipCode: configuration.zipCode!, phone: configuration.phone
      },
      sale: {
        code: sale.code, total: number(sale.total), soldAt: sale.soldAt, operatorName: sale.user?.name, notes: sale.notes, customerName: sale.customer?.name ?? "Consumidor final", customerDocument: sale.customer?.document,
        customerStateRegistration: sale.customer?.stateRegistration, customerStreet: sale.customer?.street, customerNumber: sale.customer?.addressNumber, customerComplement: sale.customer?.complement, customerDistrict: sale.customer?.district, customerCity: sale.customer?.city, customerCityCode: sale.customer?.cityCode, customerState: sale.customer?.state, customerZipCode: sale.customer?.zipCode,
        paymentMethod: sale.paymentMethod, payments: sale.payments.map((payment) => ({ method: payment.method, amount: number(payment.amount) })), discount: number(sale.discount), surcharge: number(sale.surcharge),
        items: sale.items.map((item) => ({
          code: item.product?.code || item.product?.sku || item.id, barcode: item.product?.barcode, description: item.description, quantity: number(item.quantity), unitPrice: number(item.unitPrice), discount: number(item.discount), unit: item.product?.unit || "UN",
          ncm: item.product?.ncm, cest: item.product?.cest, originCode: "0", cfop: item.product?.defaultCfop, icmsCode: "102", serviceCode: item.product?.serviceCode
        }))
      }
    };
  }

  private async configuration(tenantId: string) {
    const configuration = await prisma.fiscalConfiguration.findUnique({ where: { tenantId } });
    if (!configuration) throw new AppError("Configuração fiscal não encontrada.", "FISCAL_CONFIGURATION_MISSING", 422);
    return configuration;
  }

  private async document(tenantId: string, id: string) {
    const document = await prisma.fiscalDocument.findFirst({ where: { id, tenantId } });
    if (!document) throw new AppError("Documento fiscal não encontrado.", "FISCAL_DOCUMENT_NOT_FOUND", 404);
    return document;
  }

  private async event(tenantId: string, fiscalDocumentId: string | null, userId: string, type: "ISSUE" | "QUERY" | "CANCEL" | "VOID_NUMBER" | "REPLACE" | "EMAIL" | "RETRY", success: boolean, message: string, details?: Record<string, unknown>) {
    await prisma.fiscalEvent.create({ data: { tenantId, fiscalDocumentId, userId, type, success, message, details: details as Prisma.InputJsonValue | undefined } });
  }
}
