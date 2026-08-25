import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { inventoryMovementSchema } from "@/schemas/operations.schemas";

const number = (value: unknown) => Number(value ?? 0);

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.INVENTORY_READ);
    const tenantId = session.user.currentTenantId;
    const [products, movements] = await Promise.all([
      prisma.product.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
      prisma.inventoryMovement.findMany({ where: { tenantId }, include: { product: { select: { name: true, unit: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
    ]);
    return ok({
      products: products.map((product) => ({ id: product.id, name: product.name, category: product.category, unit: product.unit, stockQuantity: number(product.stockQuantity), minStock: number(product.minStock), maxStock: number(product.maxStock), costPrice: number(product.costPrice), salePrice: number(product.salePrice), isLowStock: number(product.minStock) > 0 && number(product.stockQuantity) <= number(product.minStock) })),
      movements: movements.map((movement) => ({ id: movement.id, productName: movement.product.name, unit: movement.product.unit, userName: movement.user?.name ?? "Sistema", type: movement.type, quantity: number(movement.quantity), previousBalance: number(movement.previousBalance), newBalance: number(movement.newBalance), reason: movement.reason, reference: movement.reference, createdAt: movement.createdAt.toISOString() }))
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.INVENTORY_WRITE);
    const input = inventoryMovementSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;
    const movement = await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({ where: { id: input.productId, tenantId, status: "ACTIVE" } });
      if (!product) throw new AppError("Produto nao encontrado.", "PRODUCT_NOT_FOUND", 404);
      const previousBalance = number(product.stockQuantity);
      const newBalance = input.type === "ENTRY" ? previousBalance + input.quantity : input.type === "EXIT" ? previousBalance - input.quantity : input.quantity;
      if (newBalance < 0) throw new AppError("A saida e maior que o estoque disponivel.", "INSUFFICIENT_STOCK", 422);
      await transaction.product.update({ where: { id: product.id }, data: { stockQuantity: newBalance } });
      return transaction.inventoryMovement.create({ data: { tenantId, productId: product.id, userId: session.user.id, type: input.type, quantity: input.type === "ADJUSTMENT" ? Math.abs(newBalance - previousBalance) : input.quantity, previousBalance, newBalance, reason: input.reason, reference: input.reference }, include: { product: { select: { name: true, unit: true } } } });
    });
    return created({ id: movement.id, productName: movement.product.name, unit: movement.product.unit, type: movement.type, quantity: number(movement.quantity), previousBalance: number(movement.previousBalance), newBalance: number(movement.newBalance), reason: movement.reason, reference: movement.reference, createdAt: movement.createdAt.toISOString() });
  } catch (error) { return errorResponse(error); }
}
