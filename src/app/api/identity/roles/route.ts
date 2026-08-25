import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { createRoleSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_ROLES_READ);
    const roles = await identityService.listRoles(session.user.currentTenantId);

    return ok(roles);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_ROLES_CREATE);
    const payload = await request.json();
    const input = createRoleSchema.parse(payload);
    const role = await identityService.createRole(session.user.currentTenantId, input);

    return created(role);
  } catch (error) {
    return errorResponse(error);
  }
}
