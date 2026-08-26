import { NextRequest } from "next/server";
import { z } from "zod";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const createBranchSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja.").max(80)
});

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_USERS_READ);
    const branches = await prisma.branch.findMany({
      where: { tenantId: session.user.currentTenantId, status: "ACTIVE" },
      select: { id: true, name: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { name: "asc" }]
    });
    return ok(branches);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.SETTINGS_MANAGE);
    const input = createBranchSchema.parse(await request.json());
    const tenantId = session.user.currentTenantId;

    const branch = await prisma.$transaction(async (transaction) => {
      const createdBranch = await transaction.branch.create({
        data: { tenantId, name: input.name },
        select: { id: true, name: true, isMain: true }
      });
      const products = await transaction.product.findMany({
        where: { tenantId, status: { not: "DISCONTINUED" } },
        select: { id: true, minStock: true, maxStock: true }
      });
      if (products.length > 0) {
        await transaction.productBranchStock.createMany({
          data: products.map((product) => ({
            tenantId,
            branchId: createdBranch.id,
            productId: product.id,
            stockQuantity: 0,
            minStock: product.minStock,
            maxStock: product.maxStock
          }))
        });
      }
      await transaction.auditLog.create({
        data: { tenantId, userId: session.user.id, action: "identity.branch.created", entity: "Branch", entityId: createdBranch.id, metadata: { name: createdBranch.name } }
      });
      return createdBranch;
    });

    return created(branch);
  } catch (error) {
    return errorResponse(error);
  }
}
