import type { PermissionSeed } from "@/lib/permissions";

export type IdentityUserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type PasswordResetStatus = "PENDING" | "USED" | "EXPIRED";

export type AuthMembershipRecord = {
  tenantId: string;
  tenantName: string;
  branchId?: string | null;
  branchName?: string | null;
  roleId: string;
  roleName: string;
  isOwner: boolean;
  permissions: string[];
};

export type AuthIdentityRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  status: IdentityUserStatus;
  memberships: AuthMembershipRecord[];
};

export type RegisterTenantOwnerData = {
  companyName: string;
  companyDocument: string;
  ownerName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  permissions: PermissionSeed[];
};

export type RegistrationResult = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
    document: string;
  };
  branch: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
  };
};

export type PermissionRecord = {
  id: string;
  key: string;
  name: string;
  module: string;
  description?: string | null;
};

export type RoleRecord = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: PermissionRecord[];
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: IdentityUserStatus;
  roleId: string;
  roleName: string;
  branchId?: string | null;
  branchName?: string | null;
};

export type PasswordResetRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  status: PasswordResetStatus;
  expiresAt: Date;
};

export type CreateRoleData = {
  tenantId: string;
  name: string;
  description?: string;
  permissionKeys: string[];
};

export type CreateUserData = {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  roleId: string;
  branchId?: string;
};

export type CreateEmployeeUserData = {
  tenantId: string;
  branchId: string;
  createdById: string;
  name: string;
  email: string;
  passwordHash: string;
  permissionKeys: string[];
};

export type EmployeeInvitationRecord = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  tenantId: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  roleId: string;
  permissionKeys: string[];
};

export type CreateEmployeeInvitationData = {
  tenantId: string;
  branchId: string;
  invitedById: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  permissionKeys: string[];
};

export interface IdentityRepository {
  findAuthIdentityByEmail(email: string): Promise<AuthIdentityRecord | null>;
  emailExists(email: string): Promise<boolean>;
  tenantDocumentExists(document: string): Promise<boolean>;
  roleBelongsToTenant(tenantId: string, roleId: string): Promise<boolean>;
  branchBelongsToTenant(tenantId: string, branchId: string): Promise<boolean>;
  createTenantOwner(data: RegisterTenantOwnerData): Promise<RegistrationResult>;
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findPasswordResetToken(tokenHash: string): Promise<PasswordResetRecord | null>;
  updatePasswordFromReset(data: {
    userId: string;
    tokenId: string;
    passwordHash: string;
  }): Promise<void>;
  listPermissions(): Promise<PermissionRecord[]>;
  findPermissionsByKeys(keys: string[]): Promise<PermissionRecord[]>;
  listRoles(tenantId: string): Promise<RoleRecord[]>;
  createRole(data: CreateRoleData): Promise<RoleRecord>;
  listUsers(tenantId: string): Promise<UserRecord[]>;
  createUserWithRole(data: CreateUserData): Promise<UserRecord>;
  createEmployeeUser(data: CreateEmployeeUserData): Promise<UserRecord>;
  createEmployeeInvitation(data: CreateEmployeeInvitationData): Promise<EmployeeInvitationRecord>;
  listEmployeeInvitations(tenantId: string): Promise<EmployeeInvitationRecord[]>;
  findEmployeeInvitation(tokenHash: string): Promise<EmployeeInvitationRecord | null>;
  acceptEmployeeInvitation(data: { tokenHash: string; name: string; passwordHash: string }): Promise<UserRecord | null>;
}
