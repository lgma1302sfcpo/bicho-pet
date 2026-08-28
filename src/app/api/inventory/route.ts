import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { requireSelectedBranch } from "@/lib/branch-context";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { inventoryMovementSchema } from "@/schemas/operations.schemas";

const number = (value: unknown) => Number(value ?? 0);

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.INVENTORY_READ);
    const tenantId = session.user.currentTenantId;
    const branchId = session.user.currentBranchId ?? null;
    const [products, movements] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: { branchStocks: { where: branchId ? { branchId } : {} } },
        orderBy: [{ category: "asc" }, { name: "asc" }]
      }),
      prisma.inventoryMovement.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}) },
        include: { product: { select: { name: true, unit: true } }, user: { select: { name: true } }, branch: { select: { name: true } } },
        orderBy: { createdAt: "desc" }, take: 100
      })
    ]);
    return ok({
      products: products.map((product) => {
        const stockQuantity = product.branchStocks.reduce((sum, stock) => sum + number(stock.stockQuantity), 0);
        const minStock = product.branchStocks.reduce((sum, stock) => sum + number(stock.minStock), 0);
        const maxStock = product.branchStocks.reduce((sum, stock) => sum + number(stock.maxStock), 0);
        const isLowStock = branchId
          ? minStock > 0 && stockQuantity <= minStock
          : product.branchStocks.some((stock) => number(stock.minStock) > 0 && number(stock.stockQuantity) <= number(stock.minStock));
        return { id: product.id, name: product.name, category: product.category, brand: product.brand, unit: product.unit, stockQuantity, minStock, maxStock, costPrice: number(product.costPrice), salePrice: number(product.salePrice), isLowStock };
      }),
      movements: movements.map((movement) => ({ id: movement.id, branchName: movement.branch.name, productName: movement.product.name, unit: movement.product.unit, userName: movement.user?.name ?? "Sistema", type: movement.type, quantity: number(movement.quantity), previousBalance: number(movement.previousBalance), newBalance: number(movement.newBalance), reason: movement.reason, reference: movement.reference, createdAt: movement.createdAt.toISOString() }))
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.INVENTORY_WRITE);
    const input = inventoryMovementSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;
    const branchId = requireSelectedBranch(session.user.currentBranchId);
    const movement = await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({ where: { id: input.productId, tenantId, status: "ACTIVE" } });
      if (!product) throw new AppError("Produto não encontrado.", "PRODUCT_NOT_FOUND", 404);
      const stock = await transaction.productBranchStock.upsert({
        where: { branchId_productId: { branchId, productId: product.id } },
        create: { tenantId, branchId, productId: product.id },
        update: {}
      });
      const previousBalance = number(stock.stockQuantity);
      const newBalance = input.type === "ENTRY" ? previousBalance + input.quantity : input.type === "EXIT" ? previousBalance - input.quantity : input.quantity;
      if (newBalance < 0) throw new AppError("A saída é maior que o estoque disponível.", "INSUFFICIENT_STOCK", 422);
      await transaction.productBranchStock.update({ where: { id: stock.id }, data: { stockQuantity: newBalance } });
      return transaction.inventoryMovement.create({ data: { tenantId, branchId, productId: product.id, userId: session.user.id, type: input.type, quantity: input.type === "ADJUSTMENT" ? Math.abs(newBalance - previousBalance) : input.quantity, previousBalance, newBalance, reason: input.reason, reference: input.reference }, include: { product: { select: { name: true, unit: true } } } });
    });
    return created({ id: movement.id, productName: movement.product.name, unit: movement.product.unit, type: movement.type, quantity: number(movement.quantity), previousBalance: number(movement.previousBalance), newBalance: number(movement.newBalance), reason: movement.reason, reference: movement.reference, createdAt: movement.createdAt.toISOString() });
  } catch (error) { return errorResponse(error); }
}
