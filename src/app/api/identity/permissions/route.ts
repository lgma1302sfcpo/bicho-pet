import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { identityService } from "@/services/identity";

export async function GET() {
  try {
    await requirePermission(AUTH_PERMISSIONS.IDENTITY_PERMISSIONS_READ);
    const permissions = await identityService.listPermissions();

    return ok(permissions);
  } catch (error) {
    return errorResponse(error);
  }
}
