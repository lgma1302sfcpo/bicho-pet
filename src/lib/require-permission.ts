import type { PermissionKey } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { getEffectivePermissions } from "@/lib/effective-permissions";

import { getCurrentSession } from "./auth";
import { AppError } from "./errors";

export async function requirePermission(permission: PermissionKey | PermissionKey[]) {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new AppError("Sessao obrigatoria.", "UNAUTHENTICATED", 401);
  }

  const permissions = await getEffectivePermissions(session.user.id, session.user.currentTenantId);

  const allowed = Array.isArray(permission) ? permission : [permission];
  if (!allowed.some((item) => hasPermission(permissions, item))) {
    throw new AppError("Permissão insuficiente.", "FORBIDDEN", 403, { permission });
  }

  session.user.permissions = permissions;

  return session;
}
