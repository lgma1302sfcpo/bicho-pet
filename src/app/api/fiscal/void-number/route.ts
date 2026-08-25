import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { voidFiscalNumberSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

export async function POST(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const input = voidFiscalNumberSchema.parse(await request.json());
    return ok(await fiscalService.voidNumber(session.user.currentTenantId, session.user.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
