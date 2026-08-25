import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { replaceFiscalDocumentSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const { id } = await context.params;
    const input = replaceFiscalDocumentSchema.parse(await request.json());
    return ok(await fiscalService.replaceNfse(session.user.currentTenantId, session.user.id, id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
