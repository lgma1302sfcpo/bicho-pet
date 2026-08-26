import { NextRequest } from "next/server";

import { errorResponse, ok } from "@/lib/api-response";
import { acceptEmployeeInvitationSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    return ok(await identityService.getEmployeeInvitation(token));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = await request.json();
    const input = acceptEmployeeInvitationSchema.parse({ ...payload, token });
    return ok(await identityService.acceptEmployeeInvitation(input));
  } catch (error) {
    return errorResponse(error);
  }
}
