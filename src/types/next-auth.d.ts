import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      currentTenantId: string;
      currentTenantName: string;
      currentBranchId?: string | null;
      currentBranchName?: string | null;
      canAccessAllBranches: boolean;
      roleId: string;
      roleName: string;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    currentTenantId?: string;
    currentTenantName?: string;
    currentBranchId?: string | null;
    currentBranchName?: string | null;
    canAccessAllBranches?: boolean;
    roleId?: string;
    roleName?: string;
    permissions?: string[];
  }
}
