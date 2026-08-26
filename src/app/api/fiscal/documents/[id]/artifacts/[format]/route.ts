import { errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";

type Context = { params: Promise<{ id: string; format: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_READ);
    const { id, format } = await context.params;
    if (format !== "xml" && format !== "pdf") return new Response("Formato inválido.", { status: 400 });
    const artifact = await fiscalService.artifact(session.user.currentTenantId, id, format);
    return new Response(artifact.content, {
      status: 200,
      headers: {
        "content-type": format === "xml" ? "application/xml; charset=utf-8" : "application/pdf",
        "content-disposition": `attachment; filename="${artifact.filename}"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
