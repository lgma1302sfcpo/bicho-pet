import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const { id } = await context.params;
    return ok(await fiscalService.transmitContingency(session.user.currentTenantId, session.user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}
