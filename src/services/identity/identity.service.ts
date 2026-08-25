import type {
  AuthenticatedUserDTO,
  CreateRoleDTO,
  CreateUserDTO,
  LoginDTO,
  PasswordResetConfirmDTO,
  PasswordResetRequestDTO,
  RegisterOwnerDTO
} from "@/dtos/identity/auth.dto";
import type { IdentityRepository, PermissionRecord } from "@/interfaces/identity/identity-repository.interface";
import { AppError } from "@/lib/errors";
import { BASE_PERMISSIONS } from "@/lib/permissions";
import { createResetToken, hashResetToken, type PasswordHasher } from "@/lib/password";

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async authenticate(input: LoginDTO): Promise<AuthenticatedUserDTO> {
    const user = await this.repository.findAuthIdentityByEmail(input.email);

    if (!user?.passwordHash) {
      throw new AppError("Email ou senha invalidos.", "INVALID_CREDENTIALS", 401);
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("Usuario inativo.", "USER_INACTIVE", 403);
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Email ou senha invalidos.", "INVALID_CREDENTIALS", 401);
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new AppError("Usuario sem empresa ativa.", "NO_ACTIVE_TENANT", 403);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      currentTenantId: membership.tenantId,
      currentTenantName: membership.tenantName,
      currentBranchId: membership.branchId,
      currentBranchName: membership.branchName,
      roleId: membership.roleId,
      roleName: membership.roleName,
      permissions: membership.permissions
    };
  }

  async registerOwner(input: RegisterOwnerDTO) {
    const [emailExists, documentExists] = await Promise.all([
      this.repository.emailExists(input.email),
      this.repository.tenantDocumentExists(input.companyDocument)
    ]);

    if (emailExists) {
      throw new AppError("Este email ja esta cadastrado.", "EMAIL_ALREADY_EXISTS", 409);
    }

    if (documentExists) {
      throw new AppError("Este CPF/CNPJ ja esta vinculado a uma empresa.", "DOCUMENT_ALREADY_EXISTS", 409);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.repository.createTenantOwner({
      companyName: input.companyName,
      companyDocument: input.companyDocument,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      permissions: BASE_PERMISSIONS
    });
  }

  async requestPasswordReset(input: PasswordResetRequestDTO) {
    const user = await this.repository.findAuthIdentityByEmail(input.email);

    if (!user) {
      return {
        message: "Se o email existir, enviaremos as instrucoes de recuperacao."
      };
    }

    const resetToken = createResetToken();
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.repository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    return {
      message: "Se o email existir, enviaremos as instrucoes de recuperacao.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : resetToken
    };
  }

  async confirmPasswordReset(input: PasswordResetConfirmDTO) {
    const tokenHash = hashResetToken(input.token);
    const reset = await this.repository.findPasswordResetToken(tokenHash);

    if (!reset || reset.status !== "PENDING" || reset.expiresAt < new Date()) {
      throw new AppError("Token invalido ou expirado.", "INVALID_RESET_TOKEN", 400);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    await this.repository.updatePasswordFromReset({
      userId: reset.userId,
      tokenId: reset.id,
      passwordHash
    });

    return {
      message: "Senha alterada com sucesso."
    };
  }

  listPermissions() {
    return this.repository.listPermissions();
  }

  listRoles(tenantId: string) {
    return this.repository.listRoles(tenantId);
  }

  listUsers(tenantId: string) {
    return this.repository.listUsers(tenantId);
  }

  async createRole(tenantId: string, input: CreateRoleDTO) {
    await this.assertPermissionsExist(input.permissionKeys);

    return this.repository.createRole({
      tenantId,
      name: input.name,
      description: input.description,
      permissionKeys: input.permissionKeys
    });
  }

  async createUser(tenantId: string, input: CreateUserDTO) {
    const [emailExists, roleBelongsToTenant, branchBelongsToTenant] = await Promise.all([
      this.repository.emailExists(input.email),
      this.repository.roleBelongsToTenant(tenantId, input.roleId),
      input.branchId
        ? this.repository.branchBelongsToTenant(tenantId, input.branchId)
        : Promise.resolve(true)
    ]);

    if (emailExists) {
      throw new AppError("Este email ja esta cadastrado.", "EMAIL_ALREADY_EXISTS", 409);
    }

    if (!roleBelongsToTenant) {
      throw new AppError("Cargo invalido para esta empresa.", "ROLE_NOT_FOUND", 404);
    }

    if (!branchBelongsToTenant) {
      throw new AppError("Filial invalida para esta empresa.", "BRANCH_NOT_FOUND", 404);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.repository.createUserWithRole({
      tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      roleId: input.roleId,
      branchId: input.branchId
    });
  }

  private async assertPermissionsExist(keys: string[]) {
    const uniqueKeys = Array.from(new Set(keys));
    const permissions = await this.repository.findPermissionsByKeys(uniqueKeys);
    const found = new Set(permissions.map((permission: PermissionRecord) => permission.key));
    const missing = uniqueKeys.filter((key) => !found.has(key));

    if (missing.length > 0) {
      throw new AppError("Permissoes invalidas.", "INVALID_PERMISSIONS", 422, { missing });
    }
  }
}
