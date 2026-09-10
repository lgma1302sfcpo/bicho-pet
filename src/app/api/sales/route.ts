import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requireSelectedBranch } from "@/lib/branch-context";
import { requirePermission } from "@/lib/require-permission";
import { createSaleSchema } from "@/schemas/commerce/sale.schemas";
import { commerceService } from "@/services/commerce";
import { fiscalService } from "@/services/fiscal";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.SALES_READ);
    const sales = await commerceService.listSales(session.user.currentTenantId, session.user.currentBranchId ?? null);

    return ok(sales);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission([AUTH_PERMISSIONS.SALES_WRITE, AUTH_PERMISSIONS.SALES_PDV]);
    const payload = await request.json();
    const input = createSaleSchema.parse(payload);
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const sale = await commerceService.createSale(session.user.currentTenantId, branchId, session.user.id, input);
    const [branch, soldItems] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branchId, tenantId: session.user.currentTenantId }, select: { name: true, fiscalEmissionEnabled: true } }),
      prisma.saleItem.findMany({ where: { saleId: sale.id }, select: { product: { select: { name: true, supplier: true, fiscalItemType: true } } } })
    ]);
    if (!branch?.fiscalEmissionEnabled) {
      return created({ ...sale, fiscal: { status: "DISABLED", branchName: branch?.name ?? "Loja selecionada", message: `A emissão de NFC-e está desabilitada na loja ${branch?.name ?? "selecionada"}. Nenhuma nota foi gerada nem ficou pendente.` } });
    }
    const serviceItems = soldItems.flatMap((item) => {
      if (!item.product) return [];
      const normalizedSupplier = item.product.supplier?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR") ?? "";
      return item.product.fiscalItemType === "SERVICE" || normalizedSupplier.includes("banho e tosa") ? [item.product.name] : [];
    });
    if (serviceItems.length) {
      return created({ ...sale, fiscal: { status: "SKIPPED_SERVICE", branchName: branch.name, message: `Venda registrada sem NFC-e porque contém serviço: ${serviceItems.join(", ")}. Nenhuma pendência fiscal foi criada.` } });
    }
    try {
      const document = await fiscalService.issue(session.user.currentTenantId, branchId, session.user.id, { saleId: sale.id, type: "NFCE", series: 1, contingency: false });
      if (document.status === "AUTHORIZED" || document.status === "CONTINGENCY_PENDING") {
        return created({ ...sale, fiscal: { status: "AUTHORIZED", branchName: branch.name, message: `NFC-e emitida automaticamente para a loja ${branch.name}.` } });
      }
      const message = document.rejectionReason ?? "A Secretaria da Fazenda rejeitou a NFC-e. Revise os dados fiscais.";
      await prisma.sale.update({ where: { id: sale.id }, data: { fiscalPendingAt: new Date(), fiscalPendingReason: message } });
      return created({ ...sale, fiscal: { status: "PENDING_CORRECTION", branchName: branch.name, message } });
    } catch (fiscalError) {
      const message = fiscalError instanceof Error ? fiscalError.message : "A NFC-e precisa de correção antes da emissão.";
      await prisma.sale.update({ where: { id: sale.id }, data: { fiscalPendingAt: new Date(), fiscalPendingReason: message } });
      return created({ ...sale, fiscal: { status: "PENDING_CORRECTION", branchName: branch.name, message } });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
