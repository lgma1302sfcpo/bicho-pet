import { NextRequest } from "next/server";

import { created, errorResponse } from "@/lib/api-response";
import { registerOwnerSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const input = registerOwnerSchema.parse(payload);
    const result = await identityService.registerOwner(input);

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}
