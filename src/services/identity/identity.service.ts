import type {
  AuthenticatedUserDTO,
  AcceptEmployeeInvitationDTO,
  CreateRoleDTO,
  CreateUserDTO,
  InviteEmployeeDTO,
  LoginDTO,
  PasswordResetConfirmDTO,
  PasswordResetRequestDTO,
  RegisterOwnerDTO
} from "@/dtos/identity/auth.dto";
import type { IdentityRepository, PermissionRecord } from "@/interfaces/identity/identity-repository.interface";
import type { EmailSender } from "@/interfaces/messaging/email-sender.interface";
import { AppError } from "@/lib/errors";
import { BASE_PERMISSIONS } from "@/lib/permissions";
import { createResetToken, hashResetToken, type PasswordHasher } from "@/lib/password";

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly emailSender?: EmailSender
  ) {}

  async authenticate(input: LoginDTO): Promise<AuthenticatedUserDTO> {
    const user = await this.repository.findAuthIdentityByEmail(input.email);

    if (!user?.passwordHash) {
      throw new AppError("E-mail ou senha inválidos.", "INVALID_CREDENTIALS", 401);
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("Usuário inativo.", "USER_INACTIVE", 403);
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("E-mail ou senha inválidos.", "INVALID_CREDENTIALS", 401);
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new AppError("Usuário sem empresa ativa.", "NO_ACTIVE_TENANT", 403);
    }

    if (!membership.isOwner && !membership.branchId) {
      throw new AppError("Usuário sem loja definida. Solicite ao administrador a vinculação a uma loja.", "NO_ACTIVE_BRANCH", 403);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      currentTenantId: membership.tenantId,
      currentTenantName: membership.tenantName,
      currentBranchId: membership.branchId,
      currentBranchName: membership.branchName,
      canAccessAllBranches: membership.isOwner,
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
      throw new AppError("Este e-mail já está cadastrado.", "EMAIL_ALREADY_EXISTS", 409);
    }

    if (documentExists) {
      throw new AppError("Este CPF/CNPJ já está vinculado a uma empresa.", "DOCUMENT_ALREADY_EXISTS", 409);
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
        message: "Se o e-mail existir, enviaremos as instruções de recuperação."
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
      message: "Se o e-mail existir, enviaremos as instruções de recuperação.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : resetToken
    };
  }

  async confirmPasswordReset(input: PasswordResetConfirmDTO) {
    const tokenHash = hashResetToken(input.token);
    const reset = await this.repository.findPasswordResetToken(tokenHash);

    if (!reset || reset.status !== "PENDING" || reset.expiresAt < new Date()) {
      throw new AppError("Token inválido ou expirado.", "INVALID_RESET_TOKEN", 400);
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
      throw new AppError("Este e-mail já está cadastrado.", "EMAIL_ALREADY_EXISTS", 409);
    }

    if (!roleBelongsToTenant) {
      throw new AppError("Cargo inválido para esta empresa.", "ROLE_NOT_FOUND", 404);
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

  async inviteEmployee(input: {
    tenantId: string;
    invitedById: string;
    inviterPermissions: string[];
    canAccessAllBranches: boolean;
    currentBranchId?: string | null;
    invitation: InviteEmployeeDTO;
  }) {
    if (await this.repository.emailExists(input.invitation.email)) {
      throw new AppError("Este e-mail já possui acesso ao sistema.", "EMAIL_ALREADY_EXISTS", 409);
    }
    if (!input.canAccessAllBranches && input.invitation.branchId !== input.currentBranchId) {
      throw new AppError("Você só pode convidar funcionários para a sua loja.", "BRANCH_ACCESS_DENIED", 403);
    }
    if (!(await this.repository.branchBelongsToTenant(input.tenantId, input.invitation.branchId))) {
      throw new AppError("Loja inválida para esta empresa.", "BRANCH_NOT_FOUND", 404);
    }
    const uniquePermissions = Array.from(new Set(input.invitation.permissionKeys));
    const unauthorized = uniquePermissions.filter((permission) => !input.inviterPermissions.includes(permission));
    if (unauthorized.length > 0) {
      throw new AppError("Não é permitido conceder acessos que você não possui.", "PERMISSION_ESCALATION_DENIED", 403, { unauthorized });
    }
    await this.assertPermissionsExist(uniquePermissions);

    const token = createResetToken();
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    const record = await this.repository.createEmployeeInvitation({
      tenantId: input.tenantId,
      branchId: input.invitation.branchId,
      invitedById: input.invitedById,
      email: input.invitation.email,
      tokenHash: hashResetToken(token),
      expiresAt,
      permissionKeys: uniquePermissions
    });
    const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const invitationUrl = `${appUrl}/aceitar-convite?token=${token}`;
    let emailSent = false;
    let deliveryWarning: string | undefined;
    if (this.emailSender) {
      try {
        await this.emailSender.send({
          to: record.email,
          subject: `Convite para acessar ${record.tenantName}`,
          text: `Você foi convidado para acessar ${record.tenantName}, loja ${record.branchName}. Crie sua senha neste link: ${invitationUrl}`,
          html: `<p>Você foi convidado para acessar <strong>${this.escapeHtml(record.tenantName)}</strong>, loja <strong>${this.escapeHtml(record.branchName)}</strong>.</p><p><a href="${invitationUrl}">Aceitar convite e criar senha</a></p><p>Este convite expira em 7 dias.</p>`,
          idempotencyKey: `employee-invitation-${record.id}`
        });
        emailSent = true;
      } catch (error) {
        deliveryWarning = error instanceof Error ? error.message : "Não foi possível enviar o e-mail.";
      }
    }
    return { ...record, expiresAt: record.expiresAt.toISOString(), emailSent, invitationUrl, deliveryWarning };
  }

  async listEmployeeInvitations(tenantId: string) {
    const invitations = await this.repository.listEmployeeInvitations(tenantId);
    return invitations.map((invitation) => ({
      ...invitation,
      status: invitation.status === "PENDING" && invitation.expiresAt <= new Date() ? "EXPIRED" : invitation.status,
      expiresAt: invitation.expiresAt.toISOString()
    }));
  }

  async getEmployeeInvitation(token: string) {
    const invitation = await this.repository.findEmployeeInvitation(hashResetToken(token));
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
      throw new AppError("Este convite é inválido, já foi utilizado ou expirou.", "INVITATION_INVALID", 410);
    }
    return {
      email: invitation.email,
      tenantName: invitation.tenantName,
      branchName: invitation.branchName,
      permissionKeys: invitation.permissionKeys,
      expiresAt: invitation.expiresAt.toISOString()
    };
  }

  async acceptEmployeeInvitation(input: AcceptEmployeeInvitationDTO) {
    const tokenHash = hashResetToken(input.token);
    const invitation = await this.repository.findEmployeeInvitation(tokenHash);
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
      throw new AppError("Este convite é inválido, já foi utilizado ou expirou.", "INVITATION_INVALID", 410);
    }
    if (await this.repository.emailExists(invitation.email)) {
      throw new AppError("Este e-mail já possui acesso ao sistema.", "EMAIL_ALREADY_EXISTS", 409);
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.acceptEmployeeInvitation({ tokenHash, name: input.name, passwordHash });
    if (!user) throw new AppError("Este convite não está mais disponível.", "INVITATION_INVALID", 410);
    return { message: "Acesso ativado. Você já pode entrar no sistema.", email: user.email };
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

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
  }
}
