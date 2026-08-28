import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterOwnerDTO } from "@/dtos/identity/auth.dto";
import type { IdentityRepository } from "@/interfaces/identity/identity-repository.interface";
import type { EmailSender } from "@/interfaces/messaging/email-sender.interface";
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
    createUserWithRole: vi.fn(),
    createEmployeeUser: vi.fn(),
    createEmployeeInvitation: vi.fn(),
    listEmployeeInvitations: vi.fn(),
    findEmployeeInvitation: vi.fn(),
    acceptEmployeeInvitation: vi.fn()
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
      identifier: "maria@exemplo.com",
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
        identifier: "maria@exemplo.com",
        password: "Senha123"
      })
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("converte o nome de usuário no identificador interno ao autenticar funcionário", async () => {
    vi.mocked(repository.findAuthIdentityByEmail).mockResolvedValue({
      id: "user-2",
      name: "João",
      email: "joao@usuario.erp.invalid",
      passwordHash: "hash:Senha123",
      status: "ACTIVE",
      memberships: [{ tenantId: "tenant-1", tenantName: "Loja", branchId: "branch-1", branchName: "Matriz", roleId: "role-2", roleName: "Caixa", isOwner: false, permissions: [AUTH_PERMISSIONS.SALES_PDV] }]
    });

    await service.authenticate({ identifier: "joao", password: "Senha123" });

    expect(repository.findAuthIdentityByEmail).toHaveBeenCalledWith("joao@usuario.erp.invalid");
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

  it("cadastra funcionário com usuário, senha e permissões sem e-mail real", async () => {
    vi.mocked(repository.emailExists).mockResolvedValue(false);
    vi.mocked(repository.branchBelongsToTenant).mockResolvedValue(true);
    vi.mocked(repository.findPermissionsByKeys).mockResolvedValue([{ id: "permission-1", key: AUTH_PERMISSIONS.SALES_PDV, name: "PDV", module: "sales" }]);
    vi.mocked(repository.createEmployeeUser).mockResolvedValue({ id: "user-2", name: "João", email: "joao@usuario.erp.invalid", status: "ACTIVE", roleId: "role-2", roleName: "Acesso de João", branchId: "branch-1", branchName: "Matriz" });

    const result = await service.createEmployeeUser({
      tenantId: "tenant-1",
      createdById: "admin-1",
      creatorPermissions: [AUTH_PERMISSIONS.SALES_PDV],
      canAccessAllBranches: true,
      employee: { name: "João", username: "joao", password: "Senha123", branchId: "branch-1", permissionKeys: [AUTH_PERMISSIONS.SALES_PDV] }
    });

    expect(result.username).toBe("joao");
    expect(repository.createEmployeeUser).toHaveBeenCalledWith(expect.objectContaining({ email: "joao@usuario.erp.invalid", permissionKeys: [AUTH_PERMISSIONS.SALES_PDV] }));
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

  it("impede que um administrador conceda uma permissao que nao possui", async () => {
    vi.mocked(repository.emailExists).mockResolvedValue(false);
    vi.mocked(repository.branchBelongsToTenant).mockResolvedValue(true);

    await expect(
      service.inviteEmployee({
        tenantId: "tenant-1",
        invitedById: "admin-1",
        inviterPermissions: [AUTH_PERMISSIONS.DASHBOARD_READ],
        canAccessAllBranches: true,
        currentBranchId: null,
        invitation: {
          email: "funcionario@exemplo.com",
          branchId: "branch-1",
          permissionKeys: [AUTH_PERMISSIONS.FINANCE_READ]
        }
      })
    ).rejects.toMatchObject({ code: "PERMISSION_ESCALATION_DENIED" });
  });

  it("cria convite individual e envia o link por email", async () => {
    const emailSender: EmailSender = { send: vi.fn(async () => ({ id: "email-1" })) };
    service = new IdentityService(repository, passwordHasher, emailSender);
    vi.mocked(repository.emailExists).mockResolvedValue(false);
    vi.mocked(repository.branchBelongsToTenant).mockResolvedValue(true);
    vi.mocked(repository.findPermissionsByKeys).mockResolvedValue([
      {
        id: "permission-1",
        key: AUTH_PERMISSIONS.DASHBOARD_READ,
        name: "Visualizar painel",
        module: "dashboard"
      }
    ]);
    vi.mocked(repository.createEmployeeInvitation).mockResolvedValue({
      id: "invitation-1",
      email: "funcionario@exemplo.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      tenantId: "tenant-1",
      tenantName: "Pet Shop",
      branchId: "branch-1",
      branchName: "Loja Tupi",
      roleId: "role-1",
      permissionKeys: [AUTH_PERMISSIONS.DASHBOARD_READ]
    });

    const result = await service.inviteEmployee({
      tenantId: "tenant-1",
      invitedById: "admin-1",
      inviterPermissions: [AUTH_PERMISSIONS.DASHBOARD_READ],
      canAccessAllBranches: true,
      currentBranchId: null,
      invitation: {
        email: "funcionario@exemplo.com",
        branchId: "branch-1",
        permissionKeys: [AUTH_PERMISSIONS.DASHBOARD_READ]
      }
    });

    expect(result.emailSent).toBe(true);
    expect(result.invitationUrl).toContain("/aceitar-convite?token=");
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "funcionario@exemplo.com" })
    );
  });

  it("aceita um convite valido e ativa o login do funcionario", async () => {
    vi.mocked(repository.findEmployeeInvitation).mockResolvedValue({
      id: "invitation-1",
      email: "funcionario@exemplo.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      tenantId: "tenant-1",
      tenantName: "Pet Shop",
      branchId: "branch-1",
      branchName: "Loja Tupi",
      roleId: "role-1",
      permissionKeys: [AUTH_PERMISSIONS.DASHBOARD_READ]
    });
    vi.mocked(repository.emailExists).mockResolvedValue(false);
    vi.mocked(repository.acceptEmployeeInvitation).mockResolvedValue({
      id: "user-2",
      name: "Funcionario",
      email: "funcionario@exemplo.com",
      status: "ACTIVE",
      roleId: "role-1",
      roleName: "Funcionario",
      branchId: "branch-1",
      branchName: "Loja Tupi"
    });

    const result = await service.acceptEmployeeInvitation({
      token: "a".repeat(64),
      name: "Funcionario",
      password: "Senha123",
      confirmPassword: "Senha123"
    });

    expect(result.email).toBe("funcionario@exemplo.com");
    expect(repository.acceptEmployeeInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Funcionario", passwordHash: "hash:Senha123" })
    );
  });
});
