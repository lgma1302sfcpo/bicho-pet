import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSessionMock, getEffectivePermissionsMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getEffectivePermissionsMock: vi.fn()
}));

vi.mock("@/lib/auth", () => ({ getCurrentSession: getCurrentSessionMock }));
vi.mock("@/lib/effective-permissions", () => ({ getEffectivePermissions: getEffectivePermissionsMock }));

import { AUTH_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";

const session = {
  user: {
    id: "user-1",
    currentTenantId: "tenant-1",
    permissions: [AUTH_PERMISSIONS.FINANCE_READ]
  }
};

describe("permissões atuais do funcionário", () => {
  beforeEach(() => {
    getCurrentSessionMock.mockReset();
    getEffectivePermissionsMock.mockReset();
    getCurrentSessionMock.mockResolvedValue(structuredClone(session));
  });

  it("bloqueia uma permissão removida mesmo que ela ainda esteja no token", async () => {
    getEffectivePermissionsMock.mockResolvedValue([]);

    await expect(requirePermission(AUTH_PERMISSIONS.FINANCE_READ)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403
    });
  });

  it("utiliza a permissão vigente no banco", async () => {
    getEffectivePermissionsMock.mockResolvedValue([AUTH_PERMISSIONS.CUSTOMERS_READ]);

    const result = await requirePermission(AUTH_PERMISSIONS.CUSTOMERS_READ);
    expect(result.user.permissions).toEqual([AUTH_PERMISSIONS.CUSTOMERS_READ]);
  });
});
