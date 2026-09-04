export function buildProductBranchStockRows(input: {
  tenantId: string;
  productId: string;
  selectedBranchId: string;
  branchIds: string[];
  stockQuantity: number | { toString(): string };
  minStock: number | { toString(): string };
  maxStock: number | { toString(): string };
  location?: string | null;
}) {
  return Array.from(new Set([input.selectedBranchId, ...input.branchIds])).map((branchId) => ({
    tenantId: input.tenantId,
    branchId,
    productId: input.productId,
    stockQuantity: branchId === input.selectedBranchId ? Number(input.stockQuantity) : 0,
    minStock: Number(input.minStock),
    maxStock: Number(input.maxStock),
    location: branchId === input.selectedBranchId ? input.location ?? null : null
  }));
}
