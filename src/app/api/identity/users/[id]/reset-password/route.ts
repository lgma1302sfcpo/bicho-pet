import { randomBytes } from "crypto";
import { hash } from "bcryptjs";

import { created, errorResponse } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

type Context = { params: Promise<{ id: string }> };

function temporaryPassword() {
  return `Pet${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}!`;
}

export async function POST(_request: Request, context: Context) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.SETTINGS_MANAGE);
    const { id } = await context.params;
    const user = await prisma.user.findFirst({ where: { id, memberships: { some: { tenantId: session.user.currentTenantId, isActive: true } } }, select: { id: true, email: true, name: true } });
    if (!user) throw new AppError("Usuário não encontrado.", "USER_NOT_FOUND", 404);
    const password = temporaryPassword();
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.auditLog.create({ data: { tenantId: session.user.currentTenantId, userId: session.user.id, action: "identity.user.password_reset_by_admin", entity: "User", entityId: user.id, metadata: { email: user.email } } });
    });
    return created({ user: { id: user.id, name: user.name, email: user.email }, temporaryPassword: password, message: "Senha temporária gerada. Envie-a ao funcionário pelo WhatsApp e peça que altere após entrar." });
  } catch (error) {
    return errorResponse(error);
  }
}
