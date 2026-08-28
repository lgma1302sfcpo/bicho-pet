import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { createEmployeeUserSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_USERS_READ);
    const users = await identityService.listUsers(session.user.currentTenantId);

    return ok(users);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_USERS_CREATE);
    const payload = await request.json();
    const input = createEmployeeUserSchema.parse(payload);
    const user = await identityService.createEmployeeUser({
      tenantId: session.user.currentTenantId,
      createdById: session.user.id,
      creatorPermissions: session.user.permissions,
      canAccessAllBranches: session.user.canAccessAllBranches,
      currentBranchId: session.user.currentBranchId,
      employee: input
    });

    return created(user);
  } catch (error) {
    return errorResponse(error);
  }
}
