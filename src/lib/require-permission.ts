import type { PermissionKey } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

import { getCurrentSession } from "./auth";
import { AppError } from "./errors";

export async function requirePermission(permission: PermissionKey) {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new AppError("Sessao obrigatoria.", "UNAUTHENTICATED", 401);
  }

  if (!hasPermission(session.user.permissions, permission)) {
    throw new AppError("Permissao insuficiente.", "FORBIDDEN", 403, { permission });
  }

  return session;
}
