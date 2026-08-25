import { NextRequest } from "next/server";

import { created, errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { issueFiscalDocumentSchema } from "@/schemas/fiscal/fiscal.schemas";
import { fiscalService } from "@/services/fiscal";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_WRITE);
    const input = issueFiscalDocumentSchema.parse(await request.json());
    return created(await fiscalService.issue(session.user.currentTenantId, session.user.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}
