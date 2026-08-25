import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { passwordResetConfirmSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = passwordResetConfirmSchema.parse(payload);
    const result = await identityService.confirmPasswordReset(input);

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
