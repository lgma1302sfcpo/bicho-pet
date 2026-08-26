import "server-only";

import { prisma } from "@/lib/prisma";

export async function getEffectivePermissions(userId: string, tenantId: string) {
  const memberships = await prisma.userTenantRole.findMany({
    where: { userId, tenantId, isActive: true },
    select: {
      role: {
        select: {
          permissions: {
            select: { permission: { select: { key: true } } }
          }
        }
      }
    }
  });

  return Array.from(new Set(
    memberships.flatMap((membership) => membership.role.permissions.map((item) => item.permission.key))
  ));
}
