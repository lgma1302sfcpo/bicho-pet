import { NextRequest } from "next/server";

import { created, errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { registerOwnerSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export async function POST(request: NextRequest) {
  try {
    if (await prisma.tenant.count() > 0) {
      throw new AppError("O cadastro inicial já foi concluído. Entre com sua conta ou solicite um convite ao administrador.", "REGISTRATION_CLOSED", 403);
    }
    const payload = await request.json();
    const input = registerOwnerSchema.parse(payload);
    const result = await identityService.registerOwner(input);

    return created(result);
  } catch (error) {
    return errorResponse(error);
  }
}
