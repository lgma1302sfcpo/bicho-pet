import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { adjustFiscalSequenceSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

export async function PUT(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const input = adjustFiscalSequenceSchema.parse(await request.json());
    return ok(await fiscalService.adjustSequence(session.user.currentTenantId, session.user.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
