import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { inviteEmployeeSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_USERS_READ);
    return ok(await identityService.listEmployeeInvitations(session.user.currentTenantId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.IDENTITY_USERS_CREATE);
    const invitation = inviteEmployeeSchema.parse(await request.json());
    return created(await identityService.inviteEmployee({
      tenantId: session.user.currentTenantId,
      invitedById: session.user.id,
      inviterPermissions: session.user.permissions,
      canAccessAllBranches: session.user.canAccessAllBranches,
      currentBranchId: session.user.currentBranchId,
      invitation
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
