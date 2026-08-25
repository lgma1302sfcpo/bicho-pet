import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterOwnerDTO } from "@/dtos/identity/auth.dto";
import type { IdentityRepository } from "@/interfaces/identity/identity-repository.interface";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";
import type { PasswordHasher } from "@/lib/password";
import { IdentityService } from "@/services/identity/identity.service";

function createRepositoryMock(): IdentityRepository {
  return {
    findAuthIdentityByEmail: vi.fn(),
    emailExists: vi.fn(),
    tenantDocumentExists: vi.fn(),
    roleBelongsToTenant: vi.fn(),
    branchBelongsToTenant: vi.fn(),
    createTenantOwner: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findPasswordResetToken: vi.fn(),
    updatePasswordFromReset: vi.fn(),
    listPermissions: vi.fn(),
    findPermissionsByKeys: vi.fn(),
    listRoles: vi.fn(),
    createRole: vi.fn(),
    listUsers: vi.fn(),
    createUserWithRole: vi.fn()
  };
}

const passwordHasher: PasswordHasher = {
  hash: vi.fn(async (value) => `hash:${value}`),
  verify: vi.fn(async (value, hash) => hash === `hash:${value}`)
};

describe("IdentityService", () => {
  let repository: IdentityRepository;
  let service: IdentityService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new IdentityService(repository, passwordHasher);
    vi.clearAllMocks();
  });

  it("autentica usuario ativo e retorna contexto multiempresa", async () => {
    vi.mocked(repository.findAuthIdentityByEmail).mockResolvedValue({
      id: "user-1",
      name: "Maria",
      email: "maria@exemplo.com",
      passwordHash: "hash:Senha123",
      status: "ACTIVE",
      memberships: [
        {
          tenantId: "tenant-1",
          tenantName: "Loja Central",
          branchId: "branch-1",
          branchName: "Matriz",
          roleId: "role-1",
          roleName: "Administrador",
          isOwner: true,
          permissions: [AUTH_PERMISSIONS.IDENTITY_USERS_READ]
        }
      ]
    });

    const result = await service.authenticate({
      email: "maria@exemplo.com",
      password: "Senha123"
    });

    expect(result.currentTenantId).toBe("tenant-1");
    expect(result.permissions).toContain(AUTH_PERMISSIONS.IDENTITY_USERS_READ);
  });

  it("bloqueia credenciais invalidas", async () => {
    vi.mocked(repository.findAuthIdentityByEmail).mockResolvedValue({
      id: "user-1",
      name: "Maria",
      email: "maria@exemplo.com",
      passwordHash: "hash:OutraSenha123",
      status: "ACTIVE",
      memberships: []
    });

    await expect(
      service.authenticate({
        email: "maria@exemplo.com",
        password: "Senha123"
      })
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("cadastra empresa matriz com dono administrador", async () => {
    const input: RegisterOwnerDTO = {
      companyName: "Loja Central",
      companyDocument: "12345678000190",
      ownerName: "Maria Silva",
      email: "maria@exemplo.com",
      phone: "11999991111",
      password: "Senha123",
      confirmPassword: "Senha123"
    };

    vi.mocked(repository.emailExists).mockResolvedValue(false);
    vi.mocked(repository.tenantDocumentExists).mockResolvedValue(false);
    vi.mocked(repository.createTenantOwner).mockResolvedValue({
      user: { id: "user-1", name: input.ownerName, email: input.email },
      tenant: { id: "tenant-1", name: input.companyName, document: input.companyDocument },
      branch: { id: "branch-1", name: "Matriz" },
      role: { id: "role-1", name: "Administrador" }
    });

    const result = await service.registerOwner(input);

    expect(repository.createTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: "hash:Senha123",
        permissions: expect.arrayContaining([
          expect.objectContaining({ key: AUTH_PERMISSIONS.DASHBOARD_READ })
        ])
      })
    );
    expect(result.tenant.id).toBe("tenant-1");
  });

  it("impede criar cargo com permissao inexistente", async () => {
    vi.mocked(repository.findPermissionsByKeys).mockResolvedValue([]);

    await expect(
      service.createRole("tenant-1", {
        name: "Caixa",
        permissionKeys: [AUTH_PERMISSIONS.SALES_PDV]
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("confirma reset de senha valido", async () => {
    vi.mocked(repository.findPasswordResetToken).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: "hash",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000)
    });

    await service.confirmPasswordReset({
      token: "a".repeat(64),
      password: "Senha123",
      confirmPassword: "Senha123"
    });

    expect(repository.updatePasswordFromReset).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tokenId: "token-1",
        passwordHash: "hash:Senha123"
      })
    );
  });
});
