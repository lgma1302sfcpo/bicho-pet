import type { PrismaClient } from "@prisma/client";

import type {
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
}
