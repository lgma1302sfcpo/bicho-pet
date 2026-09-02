import type { PrismaClient } from "@prisma/client";

import type {
  CreateEmployeeInvitationData,
  CreateEmployeeUserData,
  CreateRoleData,
  CreateUserData,
  IdentityRepository,
  RegisterTenantOwnerData
} from "@/interfaces/identity/identity-repository.interface";
import { prisma } from "@/lib/prisma";

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findAuthIdentityByEmail(email: string) {
    const user = await this.db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            tenant: true,
            branch: true,
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      memberships: user.memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        branchId: membership.branchId,
        branchName: membership.branch?.name,
        roleId: membership.roleId,
        roleName: membership.role.name,
        isOwner: membership.isOwner,
        permissions: membership.role.permissions.map((item) => item.permission.key)
      }))
    };
  }

  async emailExists(email: string) {
    const count = await this.db.user.count({ where: { email } });
    return count > 0;
  }

  async tenantDocumentExists(document: string) {
    const count = await this.db.tenant.count({ where: { document } });
    return count > 0;
  }

  async roleBelongsToTenant(tenantId: string, roleId: string) {
    const count = await this.db.role.count({ where: { id: roleId, tenantId } });
    return count > 0;
  }

  async branchBelongsToTenant(tenantId: string, branchId: string) {
    const count = await this.db.branch.count({ where: { id: branchId, tenantId } });
    return count > 0;
  }

  async createTenantOwner(data: RegisterTenantOwnerData) {
    return this.db.$transaction(async (tx) => {
      const permissions = await Promise.all(
        data.permissions.map((permission) =>
          tx.permission.upsert({
            where: { key: permission.key },
            update: {
              name: permission.name,
              module: permission.module,
              description: permission.description
            },
            create: permission
          })
        )
      );

      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          legalName: data.companyName,
          document: data.companyDocument,
          email: data.email,
          phone: data.phone
        }
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Matriz",
          document: data.companyDocument,
          isMain: true
        }
      });

      await tx.groomingService.createMany({
        data: [
          { tenantId: tenant.id, branchId: branch.id, name: "Banho", durationMinutes: 60, defaultPrice: 0 },
          { tenantId: tenant.id, branchId: branch.id, name: "Banho e tosa completa", durationMinutes: 90, defaultPrice: 0 },
          { tenantId: tenant.id, branchId: branch.id, name: "Tosa na tesoura", durationMinutes: 120, defaultPrice: 0 }
        ]
      });

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          passwordHash: data.passwordHash,
          status: "ACTIVE"
        }
      });

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Administrador",
          description: "Acesso total ao sistema.",
          isSystem: true,
          permissions: {
            create: permissions.map((permission) => ({
              permissionId: permission.id
            }))
          }
        }
      });

      await tx.userTenantRole.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          branchId: branch.id,
          roleId: role.id,
          isOwner: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: "identity.tenant.registered",
          entity: "Tenant",
          entityId: tenant.id,
          metadata: {
            ownerEmail: user.email
          }
        }
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          document: tenant.document
        },
        branch: {
          id: branch.id,
          name: branch.name
        },
        role: {
          id: role.id,
          name: role.name
        }
      };
    });
  }

  async createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.db.passwordResetToken.create({
      data
    });
  }

  findPasswordResetToken(tokenHash: string) {
    return this.db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        status: true,
        expiresAt: true
      }
    });
  }

  async updatePasswordFromReset(data: { userId: string; tokenId: string; passwordHash: string }) {
    await this.db.$transaction([
      this.db.user.update({
        where: { id: data.userId },
        data: {
          passwordHash: data.passwordHash,
          status: "ACTIVE"
        }
      }),
      this.db.passwordResetToken.update({
        where: { id: data.tokenId },
        data: {
          status: "USED",
          usedAt: new Date()
        }
      })
    ]);
  }

  listPermissions() {
    return this.db.permission.findMany({
      orderBy: [{ module: "asc" }, { name: "asc" }]
    });
  }

  findPermissionsByKeys(keys: string[]) {
    return this.db.permission.findMany({
      where: {
        key: {
          in: keys
        }
      }
    });
  }

  async listRoles(tenantId: string) {
    const roles = await this.db.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }]
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((item) => item.permission)
    }));
  }

  async createRole(data: CreateRoleData) {
    const permissions = await this.db.permission.findMany({
      where: {
        key: {
          in: data.permissionKeys
        }
      }
    });

    const role = await this.db.role.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id
          }))
        }
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((item) => item.permission)
    };
  }

  async listUsers(tenantId: string) {
    const memberships = await this.db.userTenantRole.findMany({
      where: { tenantId },
      include: {
        user: true,
        role: true,
        branch: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      phone: membership.user.phone,
      status: membership.user.status,
      roleId: membership.roleId,
      roleName: membership.role.name,
      branchId: membership.branchId,
      branchName: membership.branch?.name
    }));
  }

  async createUserWithRole(data: CreateUserData) {
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: data.passwordHash,
          status: "ACTIVE"
        }
      });

      const membership = await tx.userTenantRole.create({
        data: {
          userId: user.id,
          tenantId: data.tenantId,
          roleId: data.roleId,
          branchId: data.branchId
        },
        include: {
          role: true,
          branch: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: user.id,
          action: "identity.user.created",
          entity: "User",
          entityId: user.id
        }
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roleId: membership.roleId,
        roleName: membership.role.name,
        branchId: membership.branchId,
        branchName: membership.branch?.name
      };
    });
  }

  async createEmployeeUser(data: CreateEmployeeUserData) {
    return this.db.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({ where: { key: { in: data.permissionKeys } } });
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          status: "ACTIVE"
        }
      });
      const role = await tx.role.create({
        data: {
          tenantId: data.tenantId,
          name: `Acesso de ${data.name} ${user.id.slice(-6)}`,
          description: `Permissões individuais do funcionário ${data.name}.`,
          permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
        }
      });
      const membership = await tx.userTenantRole.create({
        data: {
          userId: user.id,
          tenantId: data.tenantId,
          roleId: role.id,
          branchId: data.branchId
        },
        include: { branch: true }
      });
      await tx.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.createdById,
          action: "identity.employee.created",
          entity: "User",
          entityId: user.id,
          metadata: { branchId: data.branchId, permissionKeys: data.permissionKeys }
        }
      });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roleId: role.id,
        roleName: role.name,
        branchId: membership.branchId,
        branchName: membership.branch?.name
      };
    });
  }

  async createEmployeeInvitation(data: CreateEmployeeInvitationData) {
    return this.db.$transaction(async (transaction) => {
      await transaction.userInvitation.updateMany({
        where: { tenantId: data.tenantId, email: data.email, status: "PENDING" },
        data: { status: "REVOKED" }
      });

      const permissions = await transaction.permission.findMany({ where: { key: { in: data.permissionKeys } } });
      const role = await transaction.role.create({
        data: {
          tenantId: data.tenantId,
          name: `Funcionario convidado ${data.tokenHash.slice(0, 10)}`,
          description: `Acesso individual de ${data.email}.`,
          permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) }
        }
      });
      const invitation = await transaction.userInvitation.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          roleId: role.id,
          invitedById: data.invitedById,
          email: data.email,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt
        },
        include: {
          tenant: { select: { name: true } },
          branch: { select: { name: true } },
          role: { include: { permissions: { include: { permission: true } } } }
        }
      });
      await transaction.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.invitedById,
          action: "identity.user.invited",
          entity: "UserInvitation",
          entityId: invitation.id,
          metadata: { email: data.email, branchId: data.branchId, permissionKeys: data.permissionKeys }
        }
      });
      return this.mapInvitation(invitation);
    });
  }

  async listEmployeeInvitations(tenantId: string) {
    const invitations = await this.db.userInvitation.findMany({
      where: { tenantId },
      include: {
        tenant: { select: { name: true } },
        branch: { select: { name: true } },
        role: { include: { permissions: { include: { permission: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return invitations.map((invitation) => this.mapInvitation(invitation));
  }

  async findEmployeeInvitation(tokenHash: string) {
    const invitation = await this.db.userInvitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: { select: { name: true } },
        branch: { select: { name: true } },
        role: { include: { permissions: { include: { permission: true } } } }
      }
    });
    return invitation ? this.mapInvitation(invitation) : null;
  }

  async acceptEmployeeInvitation(data: { tokenHash: string; name: string; passwordHash: string }) {
    return this.db.$transaction(async (transaction) => {
      const invitation = await transaction.userInvitation.findUnique({
        where: { tokenHash: data.tokenHash },
        include: { branch: true, role: true }
      });
      if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) return null;
      const claimed = await transaction.userInvitation.updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "ACCEPTED", acceptedAt: new Date() }
      });
      if (claimed.count === 0) return null;

      const user = await transaction.user.create({
        data: { name: data.name, email: invitation.email, passwordHash: data.passwordHash, status: "ACTIVE" }
      });
      const membership = await transaction.userTenantRole.create({
        data: { userId: user.id, tenantId: invitation.tenantId, roleId: invitation.roleId, branchId: invitation.branchId },
        include: { role: true, branch: true }
      });
      await transaction.auditLog.create({
        data: { tenantId: invitation.tenantId, userId: user.id, action: "identity.invitation.accepted", entity: "UserInvitation", entityId: invitation.id }
      });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        roleId: membership.roleId,
        roleName: membership.role.name,
        branchId: membership.branchId,
        branchName: membership.branch?.name
      };
    });
  }

  private mapInvitation(invitation: {
    id: string;
    email: string;
    status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
    expiresAt: Date;
    tenantId: string;
    branchId: string;
    roleId: string;
    tenant: { name: string };
    branch: { name: string };
    role: { permissions: Array<{ permission: { key: string } }> };
  }) {
    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      tenantId: invitation.tenantId,
      tenantName: invitation.tenant.name,
      branchId: invitation.branchId,
      branchName: invitation.branch.name,
      roleId: invitation.roleId,
      permissionKeys: invitation.role.permissions.map((item) => item.permission.key)
    };
  }
}
