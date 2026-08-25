import { NextRequest } from "next/server";

import { created, errorResponse, ok } from "@/lib/api-response";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { financialEntrySchema } from "@/schemas/operations.schemas";

const number = (value: unknown) => Number(value ?? 0);

export async function GET() {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FINANCE_READ);
    const entries = await prisma.financialEntry.findMany({ where: { tenantId: session.user.currentTenantId }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 300 });
    return ok(entries.map((entry) => ({ ...entry, amount: number(entry.amount), dueDate: entry.dueDate.toISOString(), paidAt: entry.paidAt?.toISOString() ?? null, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() })));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(AUTH_PERMISSIONS.FINANCE_WRITE);
    const input = financialEntrySchema.parse(await request.json());
    const entry = await prisma.financialEntry.create({ data: { tenantId: session.user.currentTenantId, type: input.type, status: input.status, description: input.description, category: input.category, amount: input.amount, dueDate: input.dueDate, paidAt: input.status === "PAID" ? new Date() : null, paymentMethod: input.paymentMethod || null, notes: input.notes } });
    return created({ ...entry, amount: number(entry.amount), dueDate: entry.dueDate.toISOString(), paidAt: entry.paidAt?.toISOString() ?? null });
  } catch (error) { return errorResponse(error); }
}
