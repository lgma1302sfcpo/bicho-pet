import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import type { FiscalProviderRequest } from "@/interfaces/fiscal/fiscal-provider.interface";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function documentTitle(type: "NFE" | "NFCE") {
  return type === "NFCE" ? "DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA" : "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA";
}

export async function createDirectDanfe(input: { request: FiscalProviderRequest; accessKey: string; protocol?: string; qrCodeUrl?: string | null; pendingContingency?: boolean }) {
  const consumer = input.request.type === "NFCE";
  const height = consumer ? Math.max(180, 118 + input.request.sale.items.length * 8) : 297;
  const pdf = new jsPDF({ unit: "mm", format: consumer ? [80, height] : "a4" });
  const width = consumer ? 80 : 210;
  const left = consumer ? 5 : 14;
  const right = width - left;
  let y = 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(consumer ? 7.5 : 10);
  pdf.text(pdf.splitTextToSize(documentTitle(input.request.type as "NFE" | "NFCE"), width - left * 2), width / 2, y, { align: "center" });
  y += consumer ? 10 : 8;
  pdf.setFontSize(consumer ? 9 : 14);
  pdf.text(input.request.issuer.tradeName || input.request.issuer.legalName, width / 2, y, { align: "center" });
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(consumer ? 6.5 : 9);
  pdf.text(`CNPJ ${input.request.issuer.cnpj}  IE ${input.request.issuer.stateRegistration}`, width / 2, y, { align: "center" });
  y += 4;
  pdf.text(pdf.splitTextToSize(`${input.request.issuer.street}, ${input.request.issuer.number} - ${input.request.issuer.district} - ${input.request.issuer.city}/${input.request.issuer.state}`, width - left * 2), width / 2, y, { align: "center" });
  y += 8;
  if (input.request.environment === "HOMOLOGATION") {
    pdf.setFont("helvetica", "bold");
    pdf.text("EMISSAO EM HOMOLOGACAO - SEM VALIDADE FISCAL", width / 2, y, { align: "center" });
    y += 6;
  }
  if (input.pendingContingency) {
    pdf.setFont("helvetica", "bold");
    pdf.text("EMITIDA EM CONTINGENCIA - PENDENTE DE TRANSMISSAO", width / 2, y, { align: "center" });
    y += 6;
  }
  pdf.setDrawColor(170);
  pdf.line(left, y, right, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  for (const item of input.request.sale.items) {
    const line = `${item.description}  ${item.quantity.toFixed(3)} x ${money(item.unitPrice)}${item.discount > 0 ? `  desc. ${money(item.discount)}` : ""}  ${money(item.quantity * item.unitPrice - item.discount)}`;
    const wrapped = pdf.splitTextToSize(line, width - left * 2);
    pdf.text(wrapped, left, y);
    y += wrapped.length * (consumer ? 3.2 : 4.2) + 2;
  }
  pdf.line(left, y, right, y);
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(consumer ? 9 : 12);
  pdf.text(`TOTAL ${money(input.request.sale.total)}`, right, y, { align: "right" });
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(consumer ? 6.5 : 8.5);
  pdf.text(`Documento ${input.request.type} série ${input.request.series} número ${input.request.number}`, left, y);
  y += 5;
  pdf.text(pdf.splitTextToSize(`Chave de acesso: ${input.accessKey}`, width - left * 2), left, y);
  y += consumer ? 8 : 10;
  pdf.text(pdf.splitTextToSize(`Protocolo de autorização: ${input.protocol || "Pendente"}`, width - left * 2), left, y);
  y += 7;
  if (input.qrCodeUrl) {
    const dataUrl = await QRCode.toDataURL(input.qrCodeUrl, { errorCorrectionLevel: "M", margin: 1, width: 320 });
    const qrSize = consumer ? 34 : 42;
    pdf.addImage(dataUrl, "PNG", (width - qrSize) / 2, y, qrSize, qrSize);
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}
