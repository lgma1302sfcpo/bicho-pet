import { z } from "zod";

import { isValidCnpj, isValidSaoPauloStateRegistration } from "@/lib/brazilian-documents";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const optionalDigits = z.string().trim().optional().transform((value) => value ? value.replace(/\D/g, "") : undefined);

export const fiscalConfigurationSchema = z.object({
  legalName: optionalText,
  tradeName: optionalText,
  cnpj: optionalDigits.refine((value) => !value || isValidCnpj(value), "Informe um Cadastro Nacional da Pessoa Juridica valido."),
  stateRegistration: optionalText,
  municipalRegistration: optionalText,
  taxRegime: z.enum(["MEI", "SIMPLES_NACIONAL", "SIMPLES_EXCESS", "NORMAL"]).optional().or(z.literal("")),
  cnae: optionalDigits,
  street: optionalText,
  number: optionalText,
  complement: optionalText,
  district: optionalText,
  city: optionalText,
  cityCode: optionalDigits.refine((value) => !value || value.length === 7, "O código do município deve possuir 7 números."),
  state: z.string().trim().length(2).optional().or(z.literal("")),
  zipCode: optionalDigits.refine((value) => !value || value.length === 8, "O Código de Endereçamento Postal deve possuir 8 números."),
  phone: optionalDigits,
  email: z.string().trim().email("Informe um endereço de e-mail válido.").optional().or(z.literal("")),
  environment: z.enum(["HOMOLOGATION", "PRODUCTION"]),
  provider: z.enum(["SANDBOX", "DIRECT_SEFAZ_SP", "EXTERNAL_API", "NOT_CONFIGURED"]),
  providerBaseUrl: z.string().trim().url("Informe uma URL valida.").optional().or(z.literal("")),
  providerToken: optionalText,
  certificateType: z.enum(["NONE", "A1", "A3"]),
  certificateExpiresAt: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
  certificateName: optionalText,
  certificateBase64: optionalText,
  certificatePassword: optionalText,
  nfceSecurityCodeId: optionalText,
  nfceSecurityCode: optionalText,
  enableNfe: z.boolean(),
  enableNfce: z.boolean(),
  enableNfse: z.boolean(),
  autoEmail: z.boolean(),
  directTransmissionEnabled: z.boolean().default(false),
  accountantApproved: z.boolean()
}).superRefine((value, context) => {
  if (value.environment === "PRODUCTION" && value.provider === "SANDBOX") {
    context.addIssue({ code: "custom", path: ["provider"], message: "O provedor de testes não pode ser usado em produção." });
  }
  if (value.provider === "EXTERNAL_API" && !value.providerBaseUrl) {
    context.addIssue({ code: "custom", path: ["providerBaseUrl"], message: "Informe o endereço da interface do provedor." });
  }
  if (value.environment === "PRODUCTION" && value.provider === "DIRECT_SEFAZ_SP" && !value.directTransmissionEnabled) {
    context.addIssue({ code: "custom", path: ["directTransmissionEnabled"], message: "Confirme explicitamente a liberação da transmissão direta em produção." });
  }
  if (value.state === "SP" && value.stateRegistration && !isValidSaoPauloStateRegistration(value.stateRegistration)) {
    context.addIssue({ code: "custom", path: ["stateRegistration"], message: "Informe uma Inscrição Estadual válida de São Paulo." });
  }
});

export const issueFiscalDocumentSchema = z.object({
  saleId: z.string().min(1),
  type: z.enum(["NFE", "NFCE", "NFSE"]),
  series: z.coerce.number().int().min(1).max(999).default(1),
  contingency: z.boolean().default(false),
  contingencyReason: optionalText
}).superRefine((value, context) => {
  if (value.contingency && value.type !== "NFCE") context.addIssue({ code: "custom", path: ["contingency"], message: "A contingência offline direta está disponível somente para a Nota Fiscal de Consumidor Eletrônica." });
  if (value.contingency && (!value.contingencyReason || value.contingencyReason.length < 15)) context.addIssue({ code: "custom", path: ["contingencyReason"], message: "Informe por que a Secretaria da Fazenda esta indisponivel, com pelo menos 15 caracteres." });
});

export const cancelFiscalDocumentSchema = z.object({
  reason: z.string().trim().min(15, "Informe um motivo com pelo menos 15 caracteres.").max(255)
});

export const voidFiscalNumberSchema = z.object({
  type: z.enum(["NFE", "NFCE", "NFSE"]),
  series: z.coerce.number().int().min(1).max(999),
  numberFrom: z.coerce.number().int().positive(),
  numberTo: z.coerce.number().int().positive(),
  reason: z.string().trim().min(15).max(255)
}).refine((value) => value.numberTo >= value.numberFrom, { path: ["numberTo"], message: "O número final deve ser maior ou igual ao inicial." });

export const replaceFiscalDocumentSchema = z.object({
  replacementSaleId: z.string().min(1),
  series: z.coerce.number().int().min(1).max(999).default(1),
  reason: z.string().trim().min(15, "Informe um motivo com pelo menos 15 caracteres.").max(255)
});
