import { describe, expect, it } from "vitest";

import type { SaleListItemDTO } from "@/dtos/commerce/sale.dto";
import { getAllocatedItemRevenue, getSaleRevenueFactor } from "@/lib/sales-report";

function saleWithDiscountAndSurcharge(): SaleListItemDTO {
  return {
    id: "sale-1",
    code: "VD-TESTE",
    branchName: "Matriz",
    paymentMethod: "PIX",
    status: "COMPLETED",
    soldAt: "2026-09-25T12:00:00.000Z",
    subtotal: 150,
    discount: 5,
    surcharge: 10,
    total: 155,
    itemsCount: 1,
    items: [{
      productId: "product-1",
      description: "Ração de teste",
      quantity: 2,
      unitPrice: 75,
      discount: 5,
      costPrice: 50,
      total: 145,
      category: "Ração",
      species: "DOG",
      supplier: "Fornecedor QA"
    }]
  };
}

describe("valores analíticos do relatório de vendas", () => {
  it("rateia o total final sobre os itens que já têm o desconto aplicado", () => {
    const sale = saleWithDiscountAndSurcharge();

    expect(getSaleRevenueFactor(sale)).toBeCloseTo(155 / 145, 10);
    expect(getAllocatedItemRevenue(sale, sale.items[0])).toBeCloseTo(155, 10);
  });

  it("mantém a soma das receitas dos itens igual ao total da venda", () => {
    const sale = saleWithDiscountAndSurcharge();
    const allocatedTotal = sale.items.reduce(
      (sum, item) => sum + getAllocatedItemRevenue(sale, item),
      0
    );

    expect(allocatedTotal).toBeCloseTo(sale.total, 10);
  });
});
