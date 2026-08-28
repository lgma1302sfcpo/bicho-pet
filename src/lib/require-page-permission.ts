import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/effective-permissions";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

export async function requirePagePermission(permission: PermissionKey | PermissionKey[]) {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const permissions = await getEffectivePermissions(session.user.id, session.user.currentTenantId);
  const allowed = Array.isArray(permission) ? permission : [permission];
  if (!allowed.some((item) => hasPermission(permissions, item))) redirect("/sem-acesso" as Route);

  session.user.permissions = permissions;
  return session;
}
