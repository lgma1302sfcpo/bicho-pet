import { errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_READ);
    const backup = await fiscalService.backup(session.user.currentTenantId);
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="backup-fiscal-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
