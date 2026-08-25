import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { passwordResetRequestSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = passwordResetRequestSchema.parse(payload);
    const result = await identityService.requestPasswordReset(input);

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
