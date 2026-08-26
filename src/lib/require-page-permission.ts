import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/effective-permissions";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

export async function requirePagePermission(permission: PermissionKey) {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");

  const permissions = await getEffectivePermissions(session.user.id, session.user.currentTenantId);
  if (!hasPermission(permissions, permission)) redirect("/sem-acesso" as Route);

  session.user.permissions = permissions;
  return session;
}
