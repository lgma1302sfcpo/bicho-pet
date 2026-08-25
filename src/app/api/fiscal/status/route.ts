import { z } from "zod";

import { errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { fiscalService } from "@/services/fiscal";

const querySchema = z.enum(["NFE", "NFCE"]);

export async function GET(request: Request) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FISCAL_READ);
    const type = querySchema.parse(new URL(request.url).searchParams.get("type") ?? "NFCE");
    return ok(await fiscalService.serviceStatus(session.user.currentTenantId, type));
  } catch (error) {
    return errorResponse(error);
  }
}
