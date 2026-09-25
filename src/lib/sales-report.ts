import type { SaleListItemDTO } from "@/dtos/commerce/sale.dto";

export function getSaleItemsNetTotal(sale: SaleListItemDTO) {
  return sale.items.reduce((sum, item) => sum + item.total, 0);
}

export function getSaleRevenueFactor(sale: SaleListItemDTO) {
  const itemsNetTotal = getSaleItemsNetTotal(sale);
  return itemsNetTotal > 0 ? sale.total / itemsNetTotal : 1;
}

export function getAllocatedItemRevenue(sale: SaleListItemDTO, item: SaleListItemDTO["items"][number]) {
  return item.total * getSaleRevenueFactor(sale);
}
