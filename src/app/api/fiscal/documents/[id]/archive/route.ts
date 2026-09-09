import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

const archiveFiscalDocumentSchema = z.object({
  reason: z.string().trim().min(5, "Informe um motivo com pelo menos 5 caracteres.").max(500)
});

export async function POST(request: Request, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const { id } = await context.params;
    const input = archiveFiscalDocumentSchema.parse(await request.json());
    return ok(await fiscalService.archiveFailedDocument(session.user.currentTenantId, session.user.id, id, input.reason));
  } catch (error) {
    return errorResponse(error);
  }
}
