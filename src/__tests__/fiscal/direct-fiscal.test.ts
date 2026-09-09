import forge from "node-forge";
import { describe, expect, it } from "vitest";

import type { FiscalProviderRequest } from "@/interfaces/fiscal/fiscal-provider.interface";
import { buildNfeAccessKey, nfeCheckDigit } from "@/services/fiscal/direct/nfe-access-key";
import { extractA1Certificate } from "@/services/fiscal/direct/nfe-certificate";
import { signNfeXml, verifyNfeSignature } from "@/services/fiscal/direct/nfe-signer";
import { buildNfeXml } from "@/services/fiscal/direct/nfe-xml-builder";
import { validateNfeXml } from "@/services/fiscal/direct/nfe-xsd-validator";

function certificate() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const value = forge.pki.createCertificate();
  value.publicKey = keys.publicKey;
  value.serialNumber = "01";
  value.validity.notBefore = new Date("2025-01-01T00:00:00Z");
  value.validity.notAfter = new Date("2030-01-01T00:00:00Z");
  value.setSubject([{ name: "commonName", value: "CERTIFICADO DE TESTE SEM VALIDADE" }]);
  value.setIssuer([{ name: "commonName", value: "CERTIFICADO DE TESTE SEM VALIDADE" }]);
  value.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, value, "senha-segura-de-teste", { algorithm: "3des" });
  return { privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey), certificatePem: forge.pki.certificateToPem(value), pfx: Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary") };
}

function request(contingency = false): FiscalProviderRequest {
  return {
    documentId: "documento-teste",
    type: "NFCE",
    series: 1,
    number: 1,
    environment: "HOMOLOGATION",
    contingency: contingency ? { mode: "OFFLINE", startedAt: new Date("2026-08-24T15:00:00-03:00"), reason: "Servico fiscal temporariamente indisponivel" } : undefined,
    issuer: {
      legalName: "Marcelo Vazquez de Oliveira Pet Shop",
      tradeName: "Pet Shop Casa dos Bichos",
      cnpj: "55742132000180",
      stateRegistration: "558897276110",
      taxRegime: "SIMPLES_NACIONAL",
      street: "Rua de Homologacao",
      number: "100",
      district: "Centro",
      city: "Sao Paulo",
      cityCode: "3550308",
      state: "SP",
      zipCode: "01001000"
    },
    sale: {
      code: "VENDA-TESTE",
      total: 49.9,
      customerName: "Consumidor final",
      paymentMethod: "PIX",
      discount: 0,
      surcharge: 0,
      items: [{
        code: "RACAO-001",
        description: "Racao para caes",
        quantity: 1,
        unitPrice: 49.9,
        discount: 0,
        unit: "UN",
        ncm: "23091000",
        cfop: "5102",
        cest: "2200400"
      }]
    }
  };
}

describe("emissor fiscal direto", () => {
  it("abre um certificado A1 com a senha correta", () => {
    const keys = certificate();
    const parsed = extractA1Certificate(keys.pfx, "senha-segura-de-teste");
    expect(parsed.privateKeyPem).toContain("PRIVATE KEY");
    expect(parsed.validTo.toISOString()).toBe("2030-01-01T00:00:00.000Z");
  });

  it("gera uma chave de acesso de 44 numeros com digito verificador valido", () => {
    const result = buildNfeAccessKey({ issuedAt: new Date("2026-08-24T12:00:00-03:00"), cnpj: "55742132000180", model: 65, series: 1, number: 123, emissionType: 1, numericCode: "12345678" });
    expect(result.accessKey).toMatch(/^3526085574213200018065001000000123112345678\d$/);
    expect(Number(result.accessKey.at(-1))).toBe(nfeCheckDigit(result.accessKey.slice(0, 43)));
  });

  it("assina e valida uma Nota Fiscal de Consumidor Eletronica no esquema oficial", async () => {
    const keys = certificate();
    const built = buildNfeXml(request(), keys.privateKeyPem);
    const signed = signNfeXml(built.xml, keys.privateKeyPem, keys.certificatePem);
    expect(verifyNfeSignature(signed, keys.certificatePem)).toBe(true);
    expect(built.qrCodeUrl).toContain("|3|2");
    expect(built.qrCodeUrl).not.toContain("CSC");
    expect(signed).toContain("<ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102>");
    expect(signed).not.toContain("<PIS>");
    expect(signed).not.toContain("<COFINS>");
    expect(signed).toContain("<dPag>");
    await expect(validateNfeXml(signed)).resolves.toBeUndefined();
  }, 30_000);

  it("informa separadamente os valores de um pagamento misto", async () => {
    const keys = certificate();
    const input = request();
    input.sale.paymentMethod = "MIXED";
    input.sale.payments = [{ method: "CASH", amount: 24.9 }, { method: "DEBIT_CARD", amount: 25 }];
    const built = buildNfeXml(input, keys.privateKeyPem);
    expect(built.xml).toContain("<tPag>01</tPag><vPag>24.90</vPag>");
    expect(built.xml).toContain("<tPag>04</tPag><vPag>25.00</vPag>");
    expect(built.xml).toContain("<card><tpIntegra>2</tpIntegra></card>");
    const signed = signNfeXml(built.xml, keys.privateKeyPem, keys.certificatePem);
    await expect(validateNfeXml(signed)).resolves.toBeUndefined();
  }, 30_000);

  it("gera contingencia offline com tipo de emissao nove e QR Code assinado", async () => {
    const keys = certificate();
    const built = buildNfeXml(request(true), keys.privateKeyPem);
    const signed = signNfeXml(built.xml, keys.privateKeyPem, keys.certificatePem);
    expect(signed).toContain("<tpEmis>9</tpEmis>");
    expect(signed).toContain("<dhCont>2026-08-24T15:00:00-03:00</dhCont>");
    expect(built.qrCodeUrl?.split("|").length).toBe(8);
    await expect(validateNfeXml(signed)).resolves.toBeUndefined();
  }, 30_000);

  it("gera e valida Nota Fiscal Eletronica com destinatario fiscal completo", async () => {
    const keys = certificate();
    const input: FiscalProviderRequest = {
      ...request(),
      type: "NFE",
      sale: {
        ...request().sale,
        customerName: "Maria da Silva",
        customerDocument: "52998224725",
        customerStreet: "Rua do Cliente",
        customerNumber: "25",
        customerDistrict: "Centro",
        customerCity: "Sao Paulo",
        customerCityCode: "3550308",
        customerState: "SP",
        customerZipCode: "01001000"
      }
    };
    const built = buildNfeXml(input, keys.privateKeyPem);
    const signed = signNfeXml(built.xml, keys.privateKeyPem, keys.certificatePem);
    expect(signed).toContain("<mod>55</mod>");
    expect(signed).toContain("<CPF>52998224725</CPF>");
    await expect(validateNfeXml(signed)).resolves.toBeUndefined();
  }, 30_000);
});
